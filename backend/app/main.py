"""
FastAPI application entry point.
Registers routers, middleware, startup/shutdown hooks, and global exception handlers.
"""
import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import portfolio, risk, simulation
from app.cache.redis_client import get_redis, close_redis
from app.config import get_settings
from app.db.database import engine, Base
from app.middleware.case_conversion import CaseConversionMiddleware

logger = structlog.get_logger(__name__)
settings = get_settings()

# NOTE: This used to be followed by a second, module-level `app = FastAPI()`
# plus a hardcoded CORSMiddleware registration (allow_origins locked to
# localhost:3000). That instance was immediately shadowed by
# `app = create_app()` at the bottom of this file and never actually served
# traffic -- it was dead, confusing, copy-pasted code. Removed; CORS is
# configured once, below, from settings.allowed_origins.

# ── lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    logger.info("Starting up", environment=settings.environment)

    # Initialise DB tables (skip in production – use Alembic migrations)
    # if settings.environment == "development":
    #     async with engine.begin() as conn:
    #         await conn.run_sync(Base.metadata.create_all)
    #         await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=True))


    # Warm Redis connection pool
    await get_redis()
    logger.info("Redis connected")

    yield  # ← application runs here

    logger.info("Shutting down")
    await close_redis()


# ── app factory ──────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # camelCase (frontend) <-> snake_case (backend) translation, applied
    # once here instead of per-API-client-module on the frontend. See
    # app/middleware/case_conversion.py for details and limitations.
    app.add_middleware(CaseConversionMiddleware)

    # Request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{duration:.4f}s"
        logger.debug(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration * 1000, 2),
        )
        return response

    # Global exception handler
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    # Routers
    app.include_router(portfolio.router, prefix=settings.api_prefix)
    app.include_router(risk.router, prefix=settings.api_prefix)
    app.include_router(simulation.router, prefix=settings.api_prefix)

    # Health check
    @app.get("/health", tags=["ops"])
    async def health():
        return {"status": "ok", "version": settings.app_version}

    return app


app = create_app()