"""
Quant analytics core.

Import directly from submodules for explicitness, or use the re-exports here
for convenience.
"""
from app.analytics.returns import (
    simple_returns, log_returns, portfolio_returns,
    annualized_return, cumulative_returns,
)
from app.analytics.volatility import (
    historical_volatility, ewma_volatility, portfolio_volatility,
)
from app.analytics.covariance import (
    sample_covariance, ewma_covariance, cholesky_decompose,
    correlation_from_covariance,
)
from app.analytics.var import historical_var, parametric_var, var_from_simulations
from app.analytics.cvar import historical_cvar, parametric_cvar, cvar_from_simulations
from app.analytics.monte_carlo import run_simulation, simulation_summary, sample_paths
from app.analytics.sanitize import sanitize_numeric

__all__ = [
    "simple_returns", "log_returns", "portfolio_returns",
    "annualized_return", "cumulative_returns",
    "historical_volatility", "ewma_volatility", "portfolio_volatility",
    "sample_covariance", "ewma_covariance", "cholesky_decompose",
    "correlation_from_covariance",
    "historical_var", "parametric_var", "var_from_simulations",
    "historical_cvar", "parametric_cvar", "cvar_from_simulations",
    "run_simulation", "simulation_summary", "sample_paths",
    "sanitize_numeric",
]