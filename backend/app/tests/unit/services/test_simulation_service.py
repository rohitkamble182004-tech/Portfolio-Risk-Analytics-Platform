"""Unit tests for services/simulation_service.py."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.simulation import SimulationRequest
from app.services.simulation_service import SimulationService


@pytest.fixture
def sim_request():
    return SimulationRequest(
        tickers=["AAPL", "MSFT", "GOOGL"],
        weights=[0.4, 0.35, 0.25],
        portfolio_value=100_000,
        num_simulations=500,   # small for test speed
        time_horizon=21,
        lookback_days=252,
        confidence_level=0.95,
        random_seed=42,
    )


@pytest.fixture
def sim_service(mock_market_data_service):
    return SimulationService(market_data=mock_market_data_service)


@pytest.mark.asyncio
class TestSimulationService:
    async def test_returns_result(self, sim_service, sim_request):
        result = await sim_service.run(sim_request)
        assert result.num_simulations == 500
        assert result.time_horizon == 21
        assert result.initial_value == 100_000

    async def test_final_value_percentiles_ordered(self, sim_service, sim_request):
        result = await sim_service.run(sim_request)
        fv = result.final_values
        assert fv.p5 <= fv.p10 <= fv.p25 <= fv.p50 <= fv.p75 <= fv.p90 <= fv.p95

    async def test_cvar_exceeds_var(self, sim_service, sim_request):
        result = await sim_service.run(sim_request)
        assert result.cvar_dollar >= result.var_dollar

    async def test_probability_of_loss_in_range(self, sim_service, sim_request):
        result = await sim_service.run(sim_request)
        assert 0.0 <= result.probability_of_loss <= 1.0

    async def test_paths_sample_included(self, sim_service, sim_request):
        result = await sim_service.run(sim_request)
        assert result.paths_sample is not None
        assert len(result.paths_sample) <= 50
        assert all(isinstance(p, list) for p in result.paths_sample)

    async def test_cache_used_without_seed(self, sim_service, sim_request):
        sim_request.random_seed = None
        mock_cached = {
            "num_simulations": 500,
            "time_horizon": 21,
            "initial_value": 100_000.0,
            "final_values": {
                "p5": 95000.0, "p10": 96000.0, "p25": 98000.0, "p50": 101000.0,
                "p75": 104000.0, "p90": 107000.0, "p95": 109000.0,
            },
            "var_dollar": 3000.0,
            "cvar_dollar": 4500.0,
            "probability_of_loss": 0.3,
            "expected_final_value": 101500.0,
            "paths_sample": None,
        }
        with patch("app.services.simulation_service.cache_get",
                   AsyncMock(return_value=mock_cached)):
            result = await sim_service.run(sim_request)

        assert result.var_dollar == 3000.0

    async def test_reproducible_with_seed(self, sim_service, sim_request):
        r1 = await sim_service.run(sim_request)
        r2 = await sim_service.run(sim_request)
        assert r1.expected_final_value == pytest.approx(r2.expected_final_value, rel=1e-6)