"""Unit tests for services/risk_service.py (market data mocked)."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio

from app.schemas.risk import RiskMethod, RiskRequest
from app.services.risk_service import RiskService


@pytest.fixture
def risk_request():
    return RiskRequest(
        tickers=["AAPL", "MSFT", "GOOGL"],
        weights=[0.4, 0.35, 0.25],
        portfolio_value=100_000,
        confidence_level=0.95,
        time_horizon=1,
        lookback_days=252,
        method=RiskMethod.historical,
    )


@pytest.fixture
def risk_service(mock_market_data_service):
    return RiskService(market_data=mock_market_data_service)


@pytest.mark.asyncio
class TestRiskService:
    async def test_returns_risk_metrics(self, risk_service, risk_request):
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert result.var.var_dollar > 0
        assert result.cvar.cvar_dollar >= result.var.var_dollar
        assert result.annualized_volatility > 0

    async def test_cvar_exceeds_var(self, risk_service, risk_request):
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert result.cvar.cvar_pct >= result.var.var_pct

    async def test_parametric_method(self, risk_service, risk_request):
        risk_request.method = RiskMethod.parametric
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert result.var.method == "parametric"
        assert result.var.var_dollar > 0

    async def test_cache_hit_returns_cached(self, risk_service, risk_request):
        cached_payload = {
            "var": {
                "var_pct": 0.02, "var_dollar": 2000.0,
                "confidence_level": 0.95, "time_horizon": 1, "method": "historical",
            },
            "cvar": {"cvar_pct": 0.03, "cvar_dollar": 3000.0,
                     "confidence_level": 0.95, "time_horizon": 1},
            "sharpe_ratio": 1.2, "sortino_ratio": 1.5, "max_drawdown": -0.15,
            "annualized_return": 0.12, "annualized_volatility": 0.18,
            "beta": None, "correlation_matrix": [[1.0]], "tickers": ["AAPL"],
        }
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=cached_payload)):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert result.var.var_dollar == 2000.0

    async def test_sharpe_ratio_returned(self, risk_service, risk_request):
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert result.sharpe_ratio is not None

    async def test_correlation_matrix_shape(self, risk_service, risk_request):
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert result.correlation_matrix is not None
        n = len(result.tickers)
        assert len(result.correlation_matrix) == n
        assert all(len(row) == n for row in result.correlation_matrix)

    async def test_tickers_in_result(self, risk_service, risk_request):
        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await risk_service.compute_risk_metrics(risk_request)

        assert set(result.tickers) == {"AAPL", "MSFT", "GOOGL"}