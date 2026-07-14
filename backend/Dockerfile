# syntax=docker/dockerfile:1.7

# ───────────────── BASE ─────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# ───────────────── DEPS (PROD) ─────────────────
FROM base AS deps

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && pip install -r requirements.txt

# ───────────────── DEPS (DEV / TEST) ─────────────────
FROM deps AS dev

COPY requirements-dev.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements-dev.txt

# ───────────────── TEST IMAGE ─────────────────
FROM dev AS test

COPY app/ ./app/
CMD ["pytest", "app/tests", "-v"]

# ───────────────── FINAL (APP) ─────────────────
# Must remain the LAST stage so `docker build` (no --target) defaults to this one.
FROM deps AS final

RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

COPY --chown=appuser:appuser app/ ./app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]