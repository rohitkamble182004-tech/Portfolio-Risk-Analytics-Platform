"""
Return calculations.

Supports:
  - Simple returns
  - Log (continuously compounded) returns
  - Portfolio-level weighted returns
  - Annualized return and CAGR
"""
from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


def simple_returns(prices: pd.Series | pd.DataFrame) -> pd.Series | pd.DataFrame:
    """Percentage change between consecutive prices: (P_t / P_{t-1}) - 1."""
    return prices.pct_change().dropna()


def log_returns(prices: pd.Series | pd.DataFrame) -> pd.Series | pd.DataFrame:
    """Log returns: ln(P_t / P_{t-1}). Additive across time.

    A zero or negative price (bad tick, provider glitch, delisted
    symbol reporting a stale 0.0) produces -inf or NaN from np.log().
    `.dropna()` alone only removes NaN -- inf/-inf survive it and
    silently poison every downstream calculation (covariance, VaR,
    Monte Carlo) until something eventually raises "array must not
    contain infs or NaNs". We drop both here, at the source.
    """
    raw = np.log(prices / prices.shift(1))
    return raw.replace([np.inf, -np.inf], np.nan).dropna()


def portfolio_returns(
    asset_returns: pd.DataFrame,
    weights: np.ndarray | list[float],
) -> pd.Series:
    """
    Compute weighted portfolio return series.

    Args:
        asset_returns: DataFrame with one column per asset (rows = dates).
        weights: array-like of floats summing to ~1.

    Returns:
        pd.Series of daily portfolio returns.
    """
    w = np.asarray(weights, dtype=float)
    if not np.isclose(w.sum(), 1.0, atol=1e-4):
        raise ValueError(f"Weights must sum to 1.0, got {w.sum():.6f}")
    return asset_returns.dot(w)


def annualized_return(
    returns: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """Geometric annualized return from a series of period returns.

    If cumulative wealth (1+r1)*(1+r2)*... has gone non-positive --
    a >100% cumulative loss, generally a sign of bad input data rather
    than a real portfolio outcome -- raising it to a fractional power
    produces NaN (or a complex number) in plain Python/NumPy. We floor
    the economically sane worst case at -100% (total loss) instead of
    propagating a non-finite value.
    """
    n = len(returns)
    if n == 0:
        return 0.0
    cumulative = (1 + returns).prod()
    if not np.isfinite(cumulative) or cumulative <= 0:
        return -1.0
    return float(cumulative ** (periods_per_year / n) - 1)


def cagr(start_value: float, end_value: float, years: float) -> float:
    """Compound Annual Growth Rate."""
    if years <= 0 or start_value <= 0:
        return 0.0
    return float((end_value / start_value) ** (1 / years) - 1)


def cumulative_returns(returns: pd.Series) -> pd.Series:
    """Cumulative compounded return series (starts at 0)."""
    return (1 + returns).cumprod() - 1


def rolling_returns(
    returns: pd.Series,
    window: int,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> pd.Series:
    """Rolling annualized returns over a sliding window."""
    def _ann(x: np.ndarray) -> float:
        return float((1 + x).prod() ** (periods_per_year / len(x)) - 1)

    return returns.rolling(window).apply(_ann, raw=True)