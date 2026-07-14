"""
Central configuration loaded from environment variables / .env file.
All settings are typed and validated by Pydantic.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore", 
    )

    # ── application ──────────────────────────────────────────────────────────
    app_name: str = "Portfolio Risk Platform"
    app_version: str = "1.0.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    # ── API ───────────────────────────────────────────────────────────────────
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # ── database (PostgreSQL, optional) ──────────────────────────────────────
    # NOTE: this was previously a real-looking, committed credential
    # (postgres:Rohit%401806@localhost...) -- flagged in the contract
    # audit and still unresolved until now. Every deployment (including
    # local dev, ideally) should set DATABASE_URL via .env/environment
    # rather than relying on this default; the placeholder below is
    # intentionally obviously-fake so it's safe to commit.
    database_url: str = "postgresql+asyncpg://CHANGE_ME:CHANGE_ME@localhost:5432/portfolio_risk"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"
    cache_ttl_prices: int = 300          # 5 min  – market data
    cache_ttl_metrics: int = 60          # 1 min  – risk metrics
    cache_ttl_simulation: int = 600      # 10 min – Monte Carlo results

    # ── market data ───────────────────────────────────────────────────────────
    market_data_provider: Literal["yfinance", "alpha_vantage"] = "yfinance"
    alpha_vantage_api_key: str = ""
    default_lookback_days: int = 252     # 1 trading year
    max_lookback_days: int = 1260        # 5 trading years
    # When the real provider fails for a ticker (network error, rate
    # limit, delisted symbol, malformed response) *and no cache exists*,
    # fall back to a deterministic synthetic price series instead of
    # raising. This keeps local dev / CI / demo environments usable when
    # yfinance is flaky, at the cost of analytics running on fake data.
    # MUST be false in production -- synthetic data silently substituting
    # for real prices in a live risk calculation is far worse than an
    # honest error.
    market_data_fallback_enabled: bool = True

    # ── analytics ─────────────────────────────────────────────────────────────
    default_confidence_level: float = 0.95
    default_simulations: int = 10_000
    max_simulations: int = 100_000
    default_time_horizon: int = 1        # days

    @field_validator("default_confidence_level")
    @classmethod
    def confidence_must_be_valid(cls, v: float) -> float:
        if not 0.90 <= v < 1.0:
            raise ValueError("Confidence level must be in [0.90, 1.0)")
        return v

    @field_validator("market_data_fallback_enabled")
    @classmethod
    def fallback_never_in_production(cls, v: bool, info) -> bool:
        # Belt-and-suspenders: even if MARKET_DATA_FALLBACK_ENABLED=true
        # is accidentally set in a production .env, don't let synthetic
        # data silently substitute for real prices in a live deployment.
        if info.data.get("environment") == "production" and v:
            return False
        return v


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()