"""
Regression tests for the NaN/Inf root causes identified in the audit:

  1. A zero/negative price makes log_returns() produce -inf, which
     survived .dropna() and poisoned every downstream calculation.
  2. sample_covariance()/ewma_covariance() had no floor on n < 2
     observations, so pandas' ddof=1 .cov() returned an all-NaN
     matrix that fed straight into Cholesky decomposition.
  3. annualized_return() raised a negative cumulative product to a
     fractional power (NaN) when a single-day return was below -100%.
  4. Duplicate/perfectly-correlated assets produce a singular
     covariance matrix that used to crash Cholesky outright.

Each test reproduces the exact upstream condition and asserts the
service call completes and returns only finite numbers, rather than
mocking sanitize_numeric or asserting the fix "in spirit".
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.analytics import log_returns, sample_covariance, annualized_return
from app.analytics.covariance import cholesky_decompose
from app.analytics.sanitize import sanitize_numeric
from app.schemas.risk import RiskMethod, RiskRequest
from app.schemas.simulation import SimulationRequest
from app.services.risk_service import RiskService
from app.services.simulation_service import SimulationService


def _assert_all_finite(obj) -> None:
    if hasattr(obj, "model_dump"):
        obj = obj.model_dump()
    if isinstance(obj, dict):
        for v in obj.values():
            _assert_all_finite(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _assert_all_finite(v)
    elif isinstance(obj, float):
        assert math.isfinite(obj), f"non-finite float leaked into response: {obj}"


def _mock_mds(prices: pd.DataFrame) -> MagicMock:
    svc = MagicMock()
    svc.get_prices = AsyncMock(return_value=prices)
    svc.get_latest_prices = AsyncMock(
        return_value={c: float(prices[c].iloc[-1]) for c in prices.columns}
    )
    return svc


# ── unit-level: analytics functions directly ────────────────────────────────


class TestAnalyticsRootCauses:
    def test_log_returns_drops_inf_from_zero_price(self):
        prices = pd.Series([100.0, 0.0, 105.0])
        result = log_returns(prices)
        assert np.isfinite(result.to_numpy()).all()

    def test_log_returns_drops_inf_from_negative_price(self):
        # A negative price shouldn't exist, but bad ticks happen; log()
        # of a negative number is NaN, not an exception, in numpy.
        prices = pd.Series([100.0, -5.0, 105.0])
        result = log_returns(prices)
        assert np.isfinite(result.to_numpy()).all()

    def test_sample_covariance_single_observation_no_nan(self):
        returns = pd.DataFrame({"AAPL": [0.01], "MSFT": [0.02]})
        cov = sample_covariance(returns)
        assert np.isfinite(cov).all()

    def test_annualized_return_extreme_negative_day_no_nan(self):
        returns = pd.Series([-1.5, 0.01, 0.02, 0.01, 0.03])
        result = annualized_return(returns)
        assert math.isfinite(result)
        assert result == -1.0  # floored at total loss

    def test_cholesky_survives_nan_covariance(self):
        cov = np.array([[np.nan, 0.0], [0.0, 1e-4]])
        L = cholesky_decompose(cov)
        assert np.isfinite(L).all()

    def test_cholesky_survives_singular_duplicate_asset_covariance(self):
        # Two assets with identical returns -> perfectly correlated ->
        # singular covariance matrix.
        base = np.array([1e-4, 1e-4])
        cov = np.outer(base, base) / 1e-4  # rank-1, singular
        L = cholesky_decompose(cov)
        assert np.isfinite(L).all()

    def test_sanitize_numeric_recursive(self):
        payload = {
            "a": float("nan"),
            "b": [1.0, float("inf"), 2.0],
            "c": {"d": float("-inf"), "e": 3.0},
        }
        cleaned = sanitize_numeric(payload)
        assert cleaned == {"a": None, "b": [1.0, None, 2.0], "c": {"d": None, "e": 3.0}}


# ── service-level: exercised through RiskService / SimulationService ───────


@pytest.mark.asyncio
class TestRiskServiceEdgeCases:
    async def test_zero_price_does_not_crash_risk_metrics(self):
        dates = pd.bdate_range(end="2024-12-31", periods=10)
        prices = pd.DataFrame(
            {"AAPL": [150.0] * 5 + [0.0] + [150.0] * 4},  # a bad tick mid-series
            index=dates,
        )
        req = RiskRequest(tickers=["AAPL"], weights=[1.0], method=RiskMethod.historical)
        svc = RiskService(market_data=_mock_mds(prices))

        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await svc.compute_risk_metrics(req)

        _assert_all_finite(result)

    async def test_single_day_lookback_does_not_crash_parametric_var(self):
        dates = pd.bdate_range(end="2024-12-31", periods=2)  # only 1 return
        prices = pd.DataFrame({"AAPL": [150.0, 151.0], "MSFT": [300.0, 298.0]}, index=dates)
        req = RiskRequest(
            tickers=["AAPL", "MSFT"], weights=[0.5, 0.5], method=RiskMethod.parametric,
            lookback_days=30,
        )
        svc = RiskService(market_data=_mock_mds(prices))

        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await svc.compute_risk_metrics(req)

        _assert_all_finite(result)

    async def test_single_asset_portfolio_does_not_crash(self):
        dates = pd.bdate_range(end="2024-12-31", periods=60)
        rng = np.random.default_rng(1)
        prices = pd.DataFrame(
            {"AAPL": 150.0 * np.cumprod(1 + rng.normal(0.0003, 0.01, 60))}, index=dates
        )
        req = RiskRequest(tickers=["AAPL"], weights=[1.0], method=RiskMethod.parametric)
        svc = RiskService(market_data=_mock_mds(prices))

        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await svc.compute_risk_metrics(req)

        _assert_all_finite(result)

    async def test_constant_price_zero_variance_does_not_crash(self):
        dates = pd.bdate_range(end="2024-12-31", periods=60)
        prices = pd.DataFrame({"FLAT": [100.0] * 60}, index=dates)  # zero variance
        req = RiskRequest(tickers=["FLAT"], weights=[1.0], method=RiskMethod.parametric)
        svc = RiskService(market_data=_mock_mds(prices))

        with patch("app.services.risk_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.risk_service.cache_set", AsyncMock()):
            result = await svc.compute_risk_metrics(req)

        _assert_all_finite(result)
        assert result.sharpe_ratio is None  # zero vol -> no meaningful Sharpe, not NaN


@pytest.mark.asyncio
class TestSimulationServiceEdgeCases:
    async def test_duplicate_tickers_do_not_crash_simulation(self):
        dates = pd.bdate_range(end="2024-12-31", periods=100)
        rng = np.random.default_rng(2)
        prices = pd.DataFrame(
            {"AAPL": 150.0 * np.cumprod(1 + rng.normal(0.0003, 0.012, 100))}, index=dates
        )
        # Same ticker requested twice with split weights -> the
        # returns/covariance stage sees one column, but weight
        # alignment must not blow up.
        req = SimulationRequest(
            tickers=["AAPL", "AAPL"], weights=[0.5, 0.5],
            num_simulations=200, time_horizon=30,
        )
        svc = SimulationService(market_data=_mock_mds(prices))

        with patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.simulation_service.cache_set", AsyncMock()):
            result = await svc.run(req)

        _assert_all_finite(result)

    async def test_single_asset_simulation_does_not_crash(self):
        dates = pd.bdate_range(end="2024-12-31", periods=100)
        rng = np.random.default_rng(3)
        prices = pd.DataFrame(
            {"AAPL": 150.0 * np.cumprod(1 + rng.normal(0.0003, 0.012, 100))}, index=dates
        )
        req = SimulationRequest(
            tickers=["AAPL"], weights=[1.0], num_simulations=200, time_horizon=30,
        )
        svc = SimulationService(market_data=_mock_mds(prices))

        with patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.simulation_service.cache_set", AsyncMock()):
            result = await svc.run(req)

        _assert_all_finite(result)

    async def test_constant_returns_do_not_crash_simulation(self):
        dates = pd.bdate_range(end="2024-12-31", periods=60)
        prices = pd.DataFrame({"FLAT": [100.0] * 60}, index=dates)
        req = SimulationRequest(
            tickers=["FLAT"], weights=[1.0], num_simulations=200, time_horizon=20,
        )
        svc = SimulationService(market_data=_mock_mds(prices))

        with patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.simulation_service.cache_set", AsyncMock()):
            result = await svc.run(req)

        _assert_all_finite(result)

    async def test_very_short_lookback_does_not_crash_simulation(self):
        dates = pd.bdate_range(end="2024-12-31", periods=2)
        prices = pd.DataFrame({"AAPL": [150.0, 151.0], "MSFT": [300.0, 301.0]}, index=dates)
        req = SimulationRequest(
            tickers=["AAPL", "MSFT"], weights=[0.5, 0.5],
            num_simulations=200, time_horizon=10, lookback_days=30,
        )
        svc = SimulationService(market_data=_mock_mds(prices))

        with patch("app.services.simulation_service.cache_get", AsyncMock(return_value=None)), \
             patch("app.services.simulation_service.cache_set", AsyncMock()):
            result = await svc.run(req)

        _assert_all_finite(result)