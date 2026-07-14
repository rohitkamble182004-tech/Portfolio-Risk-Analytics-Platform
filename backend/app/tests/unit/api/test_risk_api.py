"""Unit tests for /api/v1/risk endpoints."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.risk import CVaRResult, RiskMetrics, VaRResult


def make_mock_metrics() -> RiskMetrics:
    return RiskMetrics(
        var=VaRResult(
            var_pct=0.02, var_dollar=2000.0,
            confidence_level=0.95, time_horizon=1, method="historical",
        ),
        cvar=CVaRResult(
            cvar_pct=0.03, cvar_dollar=3000.0,
            confidence_level=0.95, time_horizon=1,
        ),
        sharpe_ratio=1.2,
        sortino_ratio=1.5,
        max_drawdown=-0.15,
        annualized_return=0.12,
        annualized_volatility=0.18,
        correlation_matrix=[[1.0, 0.7], [0.7, 1.0]],
        tickers=["AAPL", "MSFT"],
    )


@pytest.mark.asyncio
class TestRiskEndpoints:
    async def test_post_metrics_success(self, client):
        with patch(
            "app.api.v1.risk.RiskService.compute_risk_metrics",
            AsyncMock(return_value=make_mock_metrics()),
        ):
            resp = await client.post("/api/v1/risk/metrics", json={
                "tickers": ["AAPL", "MSFT"],
                "weights": [0.6, 0.4],
                "portfolio_value": 100000,
                "confidence_level": 0.95,
                "time_horizon": 1,
                "lookback_days": 252,
                "method": "historical",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["var"]["varDollar"] == 2000.0
        assert data["cvar"]["cvarDollar"] == 3000.0

    async def test_mismatched_tickers_weights(self, client):
        resp = await client.post("/api/v1/risk/metrics", json={
            "tickers": ["AAPL", "MSFT"],
            "weights": [0.6, 0.3, 0.1],
            "portfolio_value": 100000,
        })
        assert resp.status_code == 422

    async def test_invalid_confidence_level(self, client):
        resp = await client.post("/api/v1/risk/metrics", json={
            "tickers": ["AAPL"],
            "weights": [1.0],
            "portfolio_value": 100000,
            "confidence_level": 0.5,   # below 0.90 minimum
        })
        assert resp.status_code == 422

    async def test_get_methods(self, client):
        resp = await client.get("/api/v1/risk/methods")
        assert resp.status_code == 200
        assert "methods" in resp.json()
        assert len(resp.json()["methods"]) == 3