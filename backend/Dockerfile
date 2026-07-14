# ───────────────── BASE ─────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*


# ───────────────── DEPS (PROD) ─────────────────
FROM base AS deps
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt


# ───────────────── DEPS (DEV / TEST) ─────────────────
FROM deps AS dev
COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt


# ───────────────── FINAL (APP) ─────────────────
FROM deps AS final
COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ───────────────── TEST IMAGE ─────────────────
# FROM dev AS test
# COPY app/ ./app/
# COPY tests/ ./tests/

# CMD ["pytest", "-v"]
FROM dev AS test

COPY app/ ./app/

# run tests from inside app/tests
CMD ["pytest", "app/tests", "-v"]