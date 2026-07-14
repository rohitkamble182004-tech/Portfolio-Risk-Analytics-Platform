"""Pydantic schemas for Monte Carlo simulation API."""
from __future__ import annotations

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    tickers: list[str] = Field(..., min_length=1, max_length=50)
    weights: list[float] = Field(..., min_length=1, max_length=50)
    portfolio_value: float = Field(default=100_000, gt=0)
    num_simulations: int = Field(default=10_000, ge=100, le=100_000)
    time_horizon: int = Field(default=252, ge=1, le=1260, description="Trading days")
    lookback_days: int = Field(default=252, ge=30, le=1260)
    confidence_level: float = Field(default=0.95, ge=0.90, lt=1.0)
    random_seed: int | None = None


class PercentileResult(BaseModel):
    p5: float
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    p95: float


class SimulationResult(BaseModel):
    num_simulations: int
    time_horizon: int
    initial_value: float
    final_values: PercentileResult
    var_dollar: float
    cvar_dollar: float
    probability_of_loss: float
    expected_final_value: float
    paths_sample: list[list[float]] | None = None  # subset for charting