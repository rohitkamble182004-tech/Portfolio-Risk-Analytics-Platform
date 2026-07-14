"""Pydantic schemas for risk API requests and responses."""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class RiskMethod(str, Enum):
    historical = "historical"
    parametric = "parametric"
    monte_carlo = "monte_carlo"


class RiskRequest(BaseModel):
    tickers: list[str] = Field(..., min_length=1, max_length=50)
    weights: list[float] = Field(..., min_length=1, max_length=50)
    portfolio_value: float = Field(default=100_000, gt=0)
    confidence_level: float = Field(default=0.95, ge=0.90, lt=1.0)
    time_horizon: int = Field(default=1, ge=1, le=252)
    lookback_days: int = Field(default=252, ge=30, le=1260)
    method: RiskMethod = RiskMethod.historical


class VaRResult(BaseModel):
    var_pct: float = Field(..., description="VaR as a fraction of portfolio value")
    var_dollar: float = Field(..., description="VaR in dollar terms")
    confidence_level: float
    time_horizon: int
    method: str


class CVaRResult(BaseModel):
    cvar_pct: float
    cvar_dollar: float
    confidence_level: float
    time_horizon: int


class RiskMetrics(BaseModel):
    var: VaRResult
    cvar: CVaRResult
    sharpe_ratio: float | None = None
    sortino_ratio: float | None = None
    max_drawdown: float | None = None
    annualized_return: float | None = None
    annualized_volatility: float | None = None
    beta: float | None = None
    correlation_matrix: list[list[float]] | None = None
    tickers: list[str]