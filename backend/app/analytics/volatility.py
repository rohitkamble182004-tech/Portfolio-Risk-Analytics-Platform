"""
Volatility estimators.

Supports:
  - Historical (realized) volatility
  - Exponentially weighted (EWMA) volatility
  - Parkinson's High-Low estimator
  - Rolling volatility
  - Annualization helpers
"""
from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


def historical_volatility(
    returns: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Standard deviation of returns annualized by sqrt(T).

    Args:
        returns: daily log or simple return series.
        periods_per_year: trading days in a year (252 for equities).
    """
    if len(returns) < 2:
        return 0.0
    return float(returns.std() * np.sqrt(periods_per_year))


def ewma_volatility(
    returns: pd.Series,
    lambda_: float = 0.94,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    RiskMetrics EWMA (exponentially weighted) volatility estimate.
    λ = 0.94 is the RiskMetrics standard for daily data.
    """
    if len(returns) < 2:
        return 0.0
    sq = returns ** 2
    weights = np.array([(1 - lambda_) * lambda_ ** i for i in range(len(sq) - 1, -1, -1)])
    weights /= weights.sum()
    variance = float(np.dot(weights, sq.values))
    return float(np.sqrt(variance * periods_per_year))


def parkinson_volatility(
    high: pd.Series,
    low: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Parkinson's (High-Low) volatility estimator.
    More efficient than close-to-close when intraday data is available.
    """
    log_hl = np.log(high / low)
    variance = (log_hl ** 2).mean() / (4 * np.log(2))
    return float(np.sqrt(variance * periods_per_year))


def rolling_volatility(
    returns: pd.Series,
    window: int = 21,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> pd.Series:
    """Rolling annualized volatility."""
    return returns.rolling(window).std() * np.sqrt(periods_per_year)


def portfolio_volatility(
    weights: np.ndarray | list[float],
    cov_matrix: np.ndarray,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Annualized portfolio volatility from the covariance matrix.
    σ_p = sqrt(w' Σ w) * sqrt(T)

    Args:
        weights: weight vector (must sum to ~1).
        cov_matrix: daily covariance matrix (n×n).
    """
    w = np.asarray(weights, dtype=float)
    cov = np.asarray(cov_matrix, dtype=float)
    daily_var = float(w @ cov @ w)
    return float(np.sqrt(daily_var * periods_per_year))