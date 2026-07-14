"""
Covariance matrix estimators and utilities.

Supports:
  - Sample covariance
  - EWMA covariance
  - Ledoit-Wolf shrinkage (via scipy)
  - Cholesky decomposition for correlated sampling
  - Correlation matrix extraction
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.linalg import cholesky, LinAlgError


def sample_covariance(returns: pd.DataFrame) -> np.ndarray:
    """
    Standard sample covariance matrix from a returns DataFrame.
    Returns a (n_assets x n_assets) daily covariance matrix.

    pandas' .cov() uses ddof=1, so a single row of data divides by
    zero and returns an all-NaN matrix rather than raising -- that
    NaN matrix would otherwise flow straight into Cholesky
    decomposition and blow up with "array must not contain infs or
    NaNs". With fewer than 2 observations there's no meaningful
    variance to estimate, so we return a diagonal matrix of zeros
    (i.e. "no information yet") instead of NaN; callers that need
    variance for e.g. Cholesky sampling still get a valid, regularizable
    matrix.
    """
    if len(returns) < 2:
        k = returns.shape[1]
        return np.zeros((k, k))
    cov = returns.cov().to_numpy()
    return np.nan_to_num(cov, nan=0.0, posinf=0.0, neginf=0.0)


def ewma_covariance(
    returns: pd.DataFrame,
    lambda_: float = 0.94,
) -> np.ndarray:
    """
    RiskMetrics EWMA covariance matrix.
    lambda = 0.94 is standard for daily equity data.
    """
    n = len(returns)
    assets = returns.columns.tolist()
    k = len(assets)

    if n == 0:
        return np.zeros((k, k))

    cov = np.zeros((k, k))

    weights = np.array([(1 - lambda_) * lambda_ ** i for i in range(n - 1, -1, -1)])
    weights /= weights.sum()

    centered = returns.values - returns.mean().values
    for i in range(n):
        r = centered[i].reshape(-1, 1)
        cov += weights[i] * (r @ r.T)

    return np.nan_to_num(cov, nan=0.0, posinf=0.0, neginf=0.0)


def ledoit_wolf_covariance(returns: pd.DataFrame) -> np.ndarray:
    """
    Ledoit-Wolf shrinkage estimator.
    Reduces estimation error for small samples or many assets.
    Requires scikit-learn.
    """
    try:
        from sklearn.covariance import LedoitWolf
        lw = LedoitWolf()
        lw.fit(returns.values)
        return lw.covariance_
    except ImportError:
        # fallback to sample covariance
        return sample_covariance(returns)


def correlation_from_covariance(cov: np.ndarray) -> np.ndarray:
    """Convert covariance matrix to correlation matrix."""
    std = np.sqrt(np.diag(cov))
    with np.errstate(divide="ignore", invalid="ignore"):
        corr = np.where(std[:, None] * std[None, :] > 0,
                        cov / (std[:, None] * std[None, :]),
                        0.0)
    np.fill_diagonal(corr, 1.0)
    return corr


def cholesky_decompose(cov: np.ndarray) -> np.ndarray:
    """
    Lower-triangular Cholesky factor L such that L L' = Sigma.
    Used to generate correlated normal samples for Monte Carlo.

    Handles the inputs that previously crashed this step with
    "array must not contain infs or NaNs" or scipy's
    LinAlgError (matrix not positive definite):
      - NaN/Inf entries (e.g. from a too-short lookback window)
      - asymmetry from floating-point drift
      - singular matrices from duplicate/perfectly-correlated assets
        or a single-asset portfolio with zero estimated variance

    Starts with a small ridge (1e-8 * I) and escalates geometrically
    if the matrix still isn't positive definite, up to a hard ceiling,
    rather than crashing the simulation outright.
    """
    clean = np.nan_to_num(cov, nan=0.0, posinf=0.0, neginf=0.0)
    clean = (clean + clean.T) / 2  # enforce symmetry (fixes fp drift)

    k = clean.shape[0]
    ridge = 1e-8
    max_ridge = 1.0  # if we need more regularization than this, the
                      # input covariance is fundamentally degenerate;
                      # better to fail loudly than silently distort risk.
    last_error: Exception | None = None

    while ridge <= max_ridge:
        try:
            regularized = clean + np.eye(k) * ridge
            return cholesky(regularized, lower=True)
        except LinAlgError as exc:
            last_error = exc
            ridge *= 100

    raise ValueError(
        "Covariance matrix is not positive-definite even after regularization "
        "up to the maximum ridge; input data is likely degenerate "
        "(e.g. constant or fully duplicated return series)."
    ) from last_error


def generate_correlated_normals(
    chol_lower: np.ndarray,
    n_samples: int,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """
    Generate correlated standard normal samples.

    Args:
        chol_lower: (k×k) lower Cholesky factor of the covariance matrix.
        n_samples: number of samples (rows).
        rng: optional numpy Generator for reproducibility.

    Returns:
        (n_samples × k) array of correlated standard normals.
    """
    if rng is None:
        rng = np.random.default_rng()
    k = chol_lower.shape[0]
    z = rng.standard_normal((n_samples, k))
    return z @ chol_lower.T