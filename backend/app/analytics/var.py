"""
Value at Risk (VaR) calculators.

Three methods are supported:
  1. Historical simulation  – uses empirical return distribution directly.
  2. Parametric (variance-covariance) – assumes normality.
  3. Monte Carlo – delegates to monte_carlo.py for scenario generation.

All VaR values are returned as *positive* loss magnitudes (dollar or fraction).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import norm

from app.analytics.returns import portfolio_returns


def historical_var(
    portfolio_returns_series: pd.Series,
    confidence_level: float = 0.95,
    time_horizon: int = 1,
    portfolio_value: float = 1.0,
) -> dict[str, float]:
    """
    Historical simulation VaR.

    Args:
        portfolio_returns_series: daily portfolio return series.
        confidence_level: e.g. 0.95 for 95% VaR.
        time_horizon: number of days (scales VaR by sqrt rule).
        portfolio_value: portfolio NAV in dollars.

    Returns:
        dict with 'var_pct' and 'var_dollar'.
    """
    if len(portfolio_returns_series) == 0:
        return {"var_pct": 0.0, "var_dollar": 0.0}

    alpha = 1.0 - confidence_level
    # Quantile of the loss distribution
    var_pct = float(-np.percentile(portfolio_returns_series, alpha * 100))
    # Scale to horizon via square-root-of-time rule
    var_pct_scaled = var_pct * np.sqrt(time_horizon)
    return {
        "var_pct": var_pct_scaled,
        "var_dollar": var_pct_scaled * portfolio_value,
    }


def parametric_var(
    weights: np.ndarray | list[float],
    mean_returns: np.ndarray | list[float],
    cov_matrix: np.ndarray,
    confidence_level: float = 0.95,
    time_horizon: int = 1,
    portfolio_value: float = 1.0,
) -> dict[str, float]:
    """
    Parametric (delta-normal) VaR.
    Assumes returns are normally distributed.

    Args:
        weights: portfolio weights vector.
        mean_returns: expected daily returns per asset.
        cov_matrix: daily covariance matrix.
        confidence_level: e.g. 0.95.
        time_horizon: days.
        portfolio_value: NAV in dollars.
    """
    w = np.asarray(weights, dtype=float)
    mu = np.asarray(mean_returns, dtype=float)
    cov = np.asarray(cov_matrix, dtype=float)

    port_mean = float(w @ mu) * time_horizon
    port_variance = float(w @ cov @ w) * time_horizon
    port_std = np.sqrt(port_variance)

    z = norm.ppf(1.0 - confidence_level)  # negative z-score
    var_pct = float(-(port_mean + z * port_std))
    return {
        "var_pct": var_pct,
        "var_dollar": var_pct * portfolio_value,
    }


def var_from_simulations(
    simulated_returns: np.ndarray,
    confidence_level: float = 0.95,
    portfolio_value: float = 1.0,
) -> dict[str, float]:
    """
    VaR from a Monte Carlo return array.

    Args:
        simulated_returns: 1-D array of simulated portfolio returns.
        confidence_level: e.g. 0.95.
        portfolio_value: NAV in dollars.
    """
    alpha = 1.0 - confidence_level
    var_pct = float(-np.percentile(simulated_returns, alpha * 100))
    return {
        "var_pct": var_pct,
        "var_dollar": var_pct * portfolio_value,
    }