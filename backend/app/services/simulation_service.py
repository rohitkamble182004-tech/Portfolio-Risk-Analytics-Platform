"""
Simulation service – wraps the Monte Carlo engine, handles caching,
and returns schema-ready results including chart-ready path samples.
"""
from __future__ import annotations

import numpy as np
import structlog

from app.analytics import (
    log_returns, sample_covariance,
    run_simulation, simulation_summary, sample_paths,
    sanitize_numeric,
)
from app.cache.redis_client import cache_get, cache_set, simulation_key
from app.config import get_settings
from app.schemas.simulation import (
    SimulationRequest, SimulationResult, PercentileResult,
)
from app.services.market_data_service import MarketDataService

logger = structlog.get_logger(__name__)
settings = get_settings()


class SimulationService:
    def __init__(self, market_data: MarketDataService | None = None) -> None:
        self._mds = market_data or MarketDataService()

    async def run(self, req: SimulationRequest) -> SimulationResult:
        """
        Full pipeline:
          1. Fetch price history
          2. Estimate drift + covariance
          3. Run Monte Carlo
          4. Compute summary statistics
          5. Return result with optional path sample
        """
        cache_k = simulation_key(req.tickers, req.weights,
                                 req.num_simulations, req.time_horizon)
        if req.random_seed is None:
            cached = await cache_get(cache_k)
            if cached:
                return SimulationResult(**cached)

        # Market data
        prices = await self._mds.get_prices(req.tickers, req.lookback_days)
        tickers_found = list(prices.columns)
        weights = self._align_weights(req.tickers, req.weights, tickers_found)

        asset_returns = log_returns(prices)
        mean_ret = np.nan_to_num(asset_returns.mean().values, nan=0.0, posinf=0.0, neginf=0.0)
        cov = sample_covariance(asset_returns)

        # Monte Carlo
        paths = run_simulation(
            weights=weights,
            mean_returns=mean_ret,
            cov_matrix=cov,
            portfolio_value=req.portfolio_value,
            num_simulations=req.num_simulations,
            time_horizon=req.time_horizon,
            random_seed=req.random_seed,
        )

        summary = simulation_summary(paths, confidence_level=req.confidence_level)

        # Include 50 paths for charting (every ~5th day to limit payload)
        step = max(1, req.time_horizon // 50)
        downsampled = paths[:, ::step]
        chart_paths = sample_paths(downsampled, n_paths=50,
                                   rng=np.random.default_rng(req.random_seed))

        # Defense-in-depth boundary (see risk_service.py for the same
        # pattern/rationale). Every field on SimulationResult is
        # required, so non-finite values fall back to 0.0 -- a
        # schema-valid "nothing meaningful to report" rather than a
        # 500 from response-model validation or, worse, NaN silently
        # reaching the frontend chart.
        result = SimulationResult(
            num_simulations=summary["num_simulations"],
            time_horizon=summary["time_horizon"],
            initial_value=sanitize_numeric(summary["initial_value"], default=0.0),
            final_values=PercentileResult(
                **sanitize_numeric(summary["final_values"], default=0.0)
            ),
            var_dollar=sanitize_numeric(summary["var_dollar"], default=0.0),
            cvar_dollar=sanitize_numeric(summary["cvar_dollar"], default=0.0),
            probability_of_loss=sanitize_numeric(summary["probability_of_loss"], default=0.0),
            expected_final_value=sanitize_numeric(summary["expected_final_value"], default=0.0),
            paths_sample=sanitize_numeric(chart_paths, default=0.0),
        )

        if req.random_seed is None:
            await cache_set(cache_k, result.model_dump(),
                            ttl=settings.cache_ttl_simulation)
        return result

    @staticmethod
    def _align_weights(
        requested: list[str],
        weights: list[float],
        found: list[str],
    ) -> np.ndarray:
        ticker_w = dict(zip(requested, weights))
        w = np.array([ticker_w.get(t, 0.0) for t in found])
        total = w.sum()
        if total <= 0:
            raise ValueError("No valid weights after ticker alignment")
        return w / total