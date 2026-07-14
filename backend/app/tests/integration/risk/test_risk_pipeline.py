"""
Integration tests for the risk and simulation pipeline.
Market data is mocked; analytics are executed for real to catch regressions.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture
def risk_payload():
    return {
        "tickers": ["AAPL", "MSFT", "GOOGL"],
        "weights": [0.4, 0.35, 0.25],
        "portfolio_value": 100_000,
        "confidence_level": 0.95,
        "time_horizon": 1,
        "lookback_days": 252,
        "method": "historical",
    }


@pytest.fixture
def sim_payload():
    return {
        "tickers": ["AAPL", "MSFT", "GOOGL"],
        "weights": [0.4, 0.35, 0.25],
        "portfolio_value": 100_000,
        "num_simulations": 500,
        "time_horizon": 21,
        "lookback_days": 252,
        "confidence_level": 0.95,
        "random_seed": 0,
    }


@pytest.mark.asyncio
class TestRiskPipeline:
    async def test_historical_var_end_to_end(self, client, sample_prices, risk_payload):
        with patch(
            "app.services.risk_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.risk_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/risk/metrics", json=risk_payload)

        assert resp.status_code == 200
        data = resp.json()
        # Updated to use camelCase keys
        assert data["var"]["varDollar"] > 0
        assert data["cvar"]["cvarDollar"] >= data["var"]["varDollar"]
        assert data["var"]["method"] == "historical"

    async def test_parametric_var_end_to_end(self, client, sample_prices, risk_payload):
        risk_payload["method"] = "parametric"
        with patch(
            "app.services.risk_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.risk_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/risk/metrics", json=risk_payload)

        assert resp.status_code == 200
        data = resp.json()
        assert data["var"]["method"] == "parametric"
        assert data["var"]["varDollar"] > 0

    async def test_sharpe_ratio_present(self, client, sample_prices, risk_payload):
        with patch(
            "app.services.risk_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.risk_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/risk/metrics", json=risk_payload)

        # Updated to use camelCase
        assert resp.json()["sharpeRatio"] is not None

    async def test_correlation_matrix_shape(self, client, sample_prices, risk_payload):
        with patch(
            "app.services.risk_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.risk_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/risk/metrics", json=risk_payload)

        data = resp.json()
        # Updated to use camelCase
        corr = data["correlationMatrix"]
        n = len(data["tickers"])
        assert len(corr) == n
        assert all(len(row) == n for row in corr)
        # diagonal should be ~1
        for i in range(n):
            assert abs(corr[i][i] - 1.0) < 1e-4


@pytest.mark.asyncio
class TestSimulationPipeline:
    async def test_simulation_end_to_end(self, client, sample_prices, sim_payload):
        with patch(
            "app.services.simulation_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.simulation_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/simulation/run", json=sim_payload)

        assert resp.status_code == 200
        data = resp.json()
        # Updated to use camelCase
        assert data["numSimulations"] == 500
        assert data["initialValue"] == 100_000
        assert data["varDollar"] > 0
        assert 0 <= data["probabilityOfLoss"] <= 1

    async def test_percentile_ordering(self, client, sample_prices, sim_payload):
        with patch(
            "app.services.simulation_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.simulation_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/simulation/run", json=sim_payload)

        # Updated to use camelCase
        fv = resp.json()["finalValues"]
        assert fv["p5"] <= fv["p10"] <= fv["p25"] <= fv["p50"] <= fv["p75"] <= fv["p90"] <= fv["p95"]

    async def test_paths_sample_returned(self, client, sample_prices, sim_payload):
        with patch(
            "app.services.simulation_service.MarketDataService.get_prices",
            AsyncMock(return_value=sample_prices),
        ), patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
           patch("app.services.simulation_service.cache_set", AsyncMock()):
            resp = await client.post("/api/v1/simulation/run", json=sim_payload)

        # Updated to use camelCase
        paths = resp.json()["pathsSample"]
        assert paths is not None
        assert len(paths) <= 50
        assert all(isinstance(p, list) for p in paths)