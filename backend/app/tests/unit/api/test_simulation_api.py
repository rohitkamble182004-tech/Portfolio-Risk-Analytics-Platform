"""Unit tests for /api/v1/simulation endpoints."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.simulation import PercentileResult, SimulationResult


def make_mock_sim_result() -> SimulationResult:
    return SimulationResult(
        num_simulations=1000,
        time_horizon=21,
        initial_value=100_000.0,
        final_values=PercentileResult(
            p5=88_000, p10=91_000, p25=96_000, p50=101_000,
            p75=106_000, p90=111_000, p95=114_000,
        ),
        var_dollar=4_500.0,
        cvar_dollar=6_200.0,
        probability_of_loss=0.28,
        expected_final_value=101_200.0,
        paths_sample=None,
    )


@pytest.mark.asyncio
class TestSimulationEndpoints:
    async def test_run_simulation_success(self, client):
        with patch(
            "app.api.v1.simulation.SimulationService.run",
            AsyncMock(return_value=make_mock_sim_result()),
        ):
            resp = await client.post("/api/v1/simulation/run", json={
                "tickers": ["AAPL", "MSFT", "GOOGL"],
                "weights": [0.4, 0.35, 0.25],
                "portfolio_value": 100000,
                "num_simulations": 1000,
                "time_horizon": 21,
                "confidence_level": 0.95,
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["varDollar"] == 4500.0
        assert data["probabilityOfLoss"] == pytest.approx(0.28)

    async def test_mismatched_tickers_weights(self, client):
        resp = await client.post("/api/v1/simulation/run", json={
            "tickers": ["AAPL"],
            "weights": [0.5, 0.5],
            "portfolio_value": 100000,
        })
        assert resp.status_code == 422

    async def test_exceeds_max_simulations(self, client):
        resp = await client.post("/api/v1/simulation/run", json={
            "tickers": ["AAPL"],
            "weights": [1.0],
            "portfolio_value": 100000,
            "num_simulations": 999_999,
        })
        assert resp.status_code == 422

    async def test_get_defaults(self, client):
        resp = await client.get("/api/v1/simulation/defaults")
        assert resp.status_code == 200
        data = resp.json()
        assert "numSimulations" in data
        assert "maxSimulations" in data
        assert "confidenceLevel" in data