"""
Conditional Value at Risk (CVaR) / Expected Shortfall (ES).

CVaR answers: *given* that we are in the worst (1-α)% of outcomes,
what is our expected loss?

All values are returned as *positive* loss magnitudes.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import norm


def historical_cvar(
    portfolio_returns_series: pd.Series,
    confidence_level: float = 0.95,
    time_horizon: int = 1,
    portfolio_value: float = 1.0,
) -> dict[str, float]:
    """
    Historical simulation CVaR (Expected Shortfall).
    Average of returns below the VaR quantile.
    """
    if len(portfolio_returns_series) == 0:
        return {"cvar_pct": 0.0, "cvar_dollar": 0.0}

    alpha = 1.0 - confidence_level
    threshold = np.percentile(portfolio_returns_series, alpha * 100)
    tail_returns = portfolio_returns_series[portfolio_returns_series <= threshold]

    if len(tail_returns) == 0:
        return {"cvar_pct": 0.0, "cvar_dollar": 0.0}

    cvar_pct = float(-tail_returns.mean()) * np.sqrt(time_horizon)
    return {
        "cvar_pct": cvar_pct,
        "cvar_dollar": cvar_pct * portfolio_value,
    }


def parametric_cvar(
    weights: np.ndarray | list[float],
    mean_returns: np.ndarray | list[float],
    cov_matrix: np.ndarray,
    confidence_level: float = 0.95,
    time_horizon: int = 1,
    portfolio_value: float = 1.0,
) -> dict[str, float]:
    """
    Parametric CVaR under normality assumption.

    ES = -μ + σ * φ(z) / (1-α)
    where φ is the standard normal PDF and z = Φ⁻¹(1-α).
    """
    w = np.asarray(weights, dtype=float)
    mu = np.asarray(mean_returns, dtype=float)
    cov = np.asarray(cov_matrix, dtype=float)

    port_mean = float(w @ mu) * time_horizon
    port_std = float(np.sqrt(w @ cov @ w)) * np.sqrt(time_horizon)
    alpha = 1.0 - confidence_level

    z = norm.ppf(alpha)
    pdf_z = norm.pdf(z)

    cvar_pct = port_std * pdf_z / alpha - port_mean
    cvar_pct = float(abs(cvar_pct))

    return {
        "cvar_pct": cvar_pct,
        "cvar_dollar": cvar_pct * portfolio_value,
    }


def cvar_from_simulations(
    simulated_returns: np.ndarray,
    confidence_level: float = 0.95,
    portfolio_value: float = 1.0,
) -> dict[str, float]:
    """
    CVaR from Monte Carlo simulated returns.
    """
    alpha = 1.0 - confidence_level
    threshold = np.percentile(simulated_returns, alpha * 100)
    tail = simulated_returns[simulated_returns <= threshold]

    if len(tail) == 0:
        return {"cvar_pct": 0.0, "cvar_dollar": 0.0}

    cvar_pct = float(-tail.mean())
    return {
        "cvar_pct": cvar_pct,
        "cvar_dollar": cvar_pct * portfolio_value,
    }