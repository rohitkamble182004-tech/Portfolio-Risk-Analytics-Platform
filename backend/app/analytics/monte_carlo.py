"""
Monte Carlo simulation engine using Geometric Brownian Motion (GBM)
with correlated asset returns via Cholesky decomposition.

Main entry point: run_simulation()
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.analytics.covariance import cholesky_decompose, generate_correlated_normals


def run_simulation(
    weights: np.ndarray | list[float],
    mean_returns: np.ndarray | list[float],
    cov_matrix: np.ndarray,
    portfolio_value: float = 100_000.0,
    num_simulations: int = 10_000,
    time_horizon: int = 252,
    random_seed: int | None = None,
) -> np.ndarray:
    """
    Simulate portfolio value paths using multivariate GBM.

    Each simulation draws correlated daily shocks from the Cholesky
    decomposition of the covariance matrix, then compounds them over
    `time_horizon` trading days.

    Args:
        weights:         asset weight vector  (k,)
        mean_returns:    daily drift per asset  (k,)
        cov_matrix:      daily covariance matrix  (k × k)
        portfolio_value: initial NAV in dollars
        num_simulations: M – number of independent paths
        time_horizon:    T – number of trading days per path
        random_seed:     for reproducibility

    Returns:
        (M × T) array of simulated portfolio values.
        Column 0 = initial value repeated; column T-1 = final values.
    """
    rng = np.random.default_rng(random_seed)

    w = np.asarray(weights, dtype=float)
    mu = np.asarray(mean_returns, dtype=float)
    cov = np.asarray(cov_matrix, dtype=float)
    k = len(w)

    # Cholesky factor for correlated sampling
    L = cholesky_decompose(cov)

    # Portfolio drift and volatility (used for scalar GBM correction)
    port_mu = float(w @ mu)                          # daily mean return
    port_var = float(w @ cov @ w)                    # daily variance
    port_sigma = np.sqrt(port_var)

    # -- Vectorised simulation ------------------------------------------------
    # Shape: (num_simulations, time_horizon, k)  →  daily asset shocks
    z = rng.standard_normal((num_simulations, time_horizon, k))
    # Correlated shocks:  ε_t = L z_t
    corr_shocks = z @ L.T                            # (M, T, k)

    # Daily asset returns: r_i = μ_i + σ_ii * ε_i  (log-normal GBM drift correction)
    daily_asset_returns = mu + corr_shocks           # (M, T, k)   – simplified drift

    # Portfolio daily returns  (M, T)
    daily_port_returns = daily_asset_returns @ w

    # Compound: portfolio value at each time step
    # Shape: (M, T+1) – include t=0
    cum_factors = np.cumprod(1 + daily_port_returns, axis=1)   # (M, T)
    paths = np.empty((num_simulations, time_horizon + 1), dtype=float)
    paths[:, 0] = portfolio_value
    paths[:, 1:] = portfolio_value * cum_factors

    return paths


def simulation_summary(
    paths: np.ndarray,
    confidence_level: float = 0.95,
) -> dict:
    """
    Compute summary statistics from simulated paths.

    Args:
        paths: (M × T+1) array from run_simulation.
        confidence_level: for VaR/CVaR.

    Returns:
        dict with percentiles, VaR, CVaR, probability of loss, etc.
    """
    initial_value = float(paths[0, 0])
    final_values = paths[:, -1]

    # Dollar returns
    dollar_returns = final_values - initial_value
    pct_returns = dollar_returns / initial_value

    alpha = 1.0 - confidence_level
    var_threshold = float(np.percentile(pct_returns, alpha * 100))
    tail_returns = pct_returns[pct_returns <= var_threshold]
    cvar_pct = float(-tail_returns.mean()) if len(tail_returns) > 0 else 0.0

    return {
        "num_simulations": paths.shape[0],
        "time_horizon": paths.shape[1] - 1,
        "initial_value": initial_value,
        "final_values": {
            "p5":  float(np.percentile(final_values, 5)),
            "p10": float(np.percentile(final_values, 10)),
            "p25": float(np.percentile(final_values, 25)),
            "p50": float(np.percentile(final_values, 50)),
            "p75": float(np.percentile(final_values, 75)),
            "p90": float(np.percentile(final_values, 90)),
            "p95": float(np.percentile(final_values, 95)),
        },
        "var_dollar": float(-var_threshold * initial_value),
        "cvar_dollar": float(cvar_pct * initial_value),
        "probability_of_loss": float(np.mean(final_values < initial_value)),
        "expected_final_value": float(final_values.mean()),
    }


def sample_paths(
    paths: np.ndarray,
    n_paths: int = 50,
    rng: np.random.Generator | None = None,
) -> list[list[float]]:
    """
    Return a random subset of paths for charting.
    Rounds values to nearest dollar to reduce payload size.
    """
    if rng is None:
        rng = np.random.default_rng()
    idx = rng.choice(paths.shape[0], size=min(n_paths, paths.shape[0]), replace=False)
    return [[round(v, 2) for v in paths[i]] for i in idx]