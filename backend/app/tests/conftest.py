"""Shared pytest fixtures for all test layers."""
from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pandas as pd
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.database import Base, get_db
from app.main import app

# ─────────────────────────────────────────────────────────────
# DATABASE CONFIG
# ─────────────────────────────────────────────────────────────

TEST_DATABASE_URL: str = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///:memory:",  # fallback for local unit tests
)

_IS_POSTGRES = TEST_DATABASE_URL.startswith("postgresql")


# ─────────────────────────────────────────────────────────────
# TEST ENGINE (ALEMBIC + ASYNC SAFE)
# ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine_kwargs: dict = {"echo": False}

    if _IS_POSTGRES:
        engine_kwargs.update(
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_pre_ping=True,
        )
    else:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        print("⚠️ Running tests on SQLite (limited features)")

    engine = create_async_engine(TEST_DATABASE_URL, **engine_kwargs)

    # ── Apply schema ───────────────────────────────────────────

    if _IS_POSTGRES:
        from alembic import command
        from alembic.config import Config

        def run_migrations(connection):
            cfg = Config(os.path.join(os.getcwd(), "alembic.ini"))
            cfg.attributes["connection"] = connection
            command.upgrade(cfg, "head")

        async with engine.begin() as conn:
            await conn.run_sync(run_migrations)

    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield engine

    # ── Cleanup ────────────────────────────────────────────────

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


# ─────────────────────────────────────────────────────────────
# DB SESSION (ROLLBACK PER TEST)
# ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(
        test_engine,
        expire_on_commit=False,
        autoflush=False,
    )

    async with factory() as session:
        async with session.begin_nested() as savepoint:
            yield session
            await savepoint.rollback()


# ─────────────────────────────────────────────────────────────
# FASTAPI TEST CLIENT
# ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ─────────────────────────────────────────────────────────────
# CONCURRENT SESSIONS (ADVANCED TESTING)
# ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def concurrent_sessions(test_engine) -> AsyncGenerator[list[AsyncSession], None]:
    """Multiple independent sessions for concurrency tests."""
    factory = async_sessionmaker(test_engine, expire_on_commit=False)

    sessions = [factory() for _ in range(5)]
    opened = [await s.__aenter__() for s in sessions]

    try:
        yield opened
    finally:
        for s in opened:
            await s.rollback()
            await s.__aexit__(None, None, None)


# ─────────────────────────────────────────────────────────────
# MARKET DATA FIXTURES
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def sample_tickers() -> list[str]:
    return ["AAPL", "MSFT", "GOOGL"]


@pytest.fixture
def sample_weights() -> list[float]:
    return [0.4, 0.35, 0.25]


@pytest.fixture
def sample_prices(sample_tickers) -> pd.DataFrame:
    np.random.seed(42)
    n = 250
    dates = pd.bdate_range(end="2024-12-31", periods=n)

    data = {}
    starts = {"AAPL": 150.0, "MSFT": 300.0, "GOOGL": 130.0}

    for t in sample_tickers:
        returns = np.random.normal(0.0003, 0.015, n)
        prices = starts[t] * np.cumprod(1 + returns)
        data[t] = prices

    return pd.DataFrame(data, index=dates)


@pytest.fixture
def sample_returns(sample_prices) -> pd.DataFrame:
    return np.log(sample_prices / sample_prices.shift(1)).dropna()


# ─────────────────────────────────────────────────────────────
# MOCK SERVICES
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_market_data_service(sample_prices):
    svc = MagicMock()

    svc.get_prices = AsyncMock(return_value=sample_prices)

    svc.get_latest_prices = AsyncMock(
        return_value={
            "AAPL": 175.0,
            "MSFT": 350.0,
            "GOOGL": 140.0,
        }
    )

    return svc