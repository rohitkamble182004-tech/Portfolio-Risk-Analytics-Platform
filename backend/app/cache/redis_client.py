"""
Async Redis client with typed helpers for caching market data and computed results.
Uses redis-py v5 async interface.
"""
from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis
import structlog

from app.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


# ── typed helpers ─────────────────────────────────────────────────────────────

async def cache_get(key: str) -> Any | None:
    """Return deserialized value or None on miss."""
    try:
        r = await get_redis()
        raw = await r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        logger.warning("cache_get failed", key=key, error=str(exc))
        return None


async def cache_set(key: str, value: Any, ttl: int) -> None:
    """Serialize and store value with TTL in seconds."""
    try:
        r = await get_redis()
        await r.setex(key, ttl, json.dumps(value))
    except Exception as exc:
        logger.warning("cache_set failed", key=key, error=str(exc))


async def cache_delete(key: str) -> None:
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception as exc:
        logger.warning("cache_delete failed", key=key, error=str(exc))


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Returns count deleted."""
    try:
        r = await get_redis()
        keys = await r.keys(pattern)
        if keys:
            return await r.delete(*keys)
        return 0
    except Exception as exc:
        logger.warning("cache_delete_pattern failed", pattern=pattern, error=str(exc))
        return 0


# ── cache key builders ────────────────────────────────────────────────────────

def price_key(ticker: str, lookback_days: int) -> str:
    return f"prices:{ticker}:{lookback_days}"


def risk_key(tickers: list[str], weights: list[float], method: str,
             confidence: float, horizon: int) -> str:
    t = ",".join(sorted(tickers))
    w = ",".join(f"{x:.4f}" for x in weights)
    return f"risk:{t}:{w}:{method}:{confidence}:{horizon}"


def simulation_key(tickers: list[str], weights: list[float],
                   n_sims: int, horizon: int) -> str:
    t = ",".join(sorted(tickers))
    w = ",".join(f"{x:.4f}" for x in weights)
    return f"sim:{t}:{w}:{n_sims}:{horizon}"

