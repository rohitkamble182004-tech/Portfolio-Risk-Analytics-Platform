"""
Regression tests for PortfolioService NaN/Infinity/timeout hardening.

These simulate a misbehaving market data provider (NaN prices,
infinite prices, zero-cost holdings, and a hung/slow provider) and
assert that _to_out() / get_portfolio_analytics() never leak a
non-finite number into the response, and never hang past the
configured timeout.
"""
from __future__ import annotations

import asyncio
import math

import pytest
from unittest.mock import AsyncMock, patch

from app.services.portfolio_service import PortfolioService

def _assert_all_finite(obj) -> None:
    """Recursively assert every float-like value in a Pydantic model
    (or nested dict/list) is finite."""
    if hasattr(obj, "model_dump"):
        obj = obj.model_dump()
    if isinstance(obj, dict):
        for v in obj.values():
            _assert_all_finite(v)
    elif isinstance(obj, list):
        for v in obj:
            _assert_all_finite(v)
    elif isinstance(obj, float):
        assert math.isfinite(obj), f"non-finite float leaked into response: {obj}"


@pytest.mark.asyncio
class TestNoNanOrInfInPortfolioOut:
    async def test_nan_price_does_not_leak(self, client):
        create = await client.post(
            "/api/v1/portfolios",
            json={"name": "NaN Test", "description": "d", "currency": "USD", "benchmark": "SPY"},
        )
        pid = create.json()["id"]

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value={"AAPL": float("nan")}),
        ):
            add = await client.post(
                f"/api/v1/portfolios/{pid}/holdings",
                json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.0, "assetClass": "equity"},
            )

        assert add.status_code in (200, 201)
        _assert_all_finite(add.json())

    async def test_infinite_price_does_not_leak(self, client):
        create = await client.post(
            "/api/v1/portfolios",
            json={"name": "Inf Test", "description": "d", "currency": "USD", "benchmark": "SPY"},
        )
        pid = create.json()["id"]

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value={"AAPL": float("inf")}),
        ):
            add = await client.post(
                f"/api/v1/portfolios/{pid}/holdings",
                json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.0, "assetClass": "equity"},
            )

        assert add.status_code in (200, 201)
        _assert_all_finite(add.json())

    async def test_zero_cost_holding_does_not_divide_by_zero_into_inf(self, client):
        create = await client.post(
            "/api/v1/portfolios",
            json={"name": "Zero Cost Test", "description": "d", "currency": "USD", "benchmark": "SPY"},
        )
        pid = create.json()["id"]

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value={"FREE": 100.0}),
        ):
            add = await client.post(
                f"/api/v1/portfolios/{pid}/holdings",
                # avg_cost effectively zero -> gain_loss_pct would be
                # inf via naive division; must come back as 0.0 instead.
                json={"ticker": "FREE", "quantity": 10, "avgCost": 0.0001, "assetClass": "equity"},
            )

        assert add.status_code in (200, 201)
        _assert_all_finite(add.json())

    async def test_slow_price_provider_times_out_instead_of_hanging(self, client):
        create = await client.post(
            "/api/v1/portfolios",
            json={"name": "Timeout Test", "description": "d", "currency": "USD", "benchmark": "SPY"},
        )
        pid = create.json()["id"]

        async def hang_forever(tickers):
            await asyncio.sleep(999)
            return {}

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            hang_forever,
        ):
            add = await client.post(
                f"/api/v1/portfolios/{pid}/holdings",
                json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.0, "assetClass": "equity"},
            )

        # Should degrade gracefully (price unavailable -> market_value 0)
        # rather than hanging until the test runner kills it.
        assert add.status_code in (200, 201)
        _assert_all_finite(add.json())
        assert add.json()["holdings"][0]["marketValue"] == 0.0


@pytest.mark.asyncio
class TestNoNanOrInfInAnalytics:
    async def test_analytics_survives_nan_price(self, client):
        create = await client.post(
            "/api/v1/portfolios",
            json={"name": "Analytics NaN Test", "description": "d", "currency": "USD", "benchmark": "SPY"},
        )
        pid = create.json()["id"]

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value={"AAPL": float("nan")}),
        ):
            await client.post(
                f"/api/v1/portfolios/{pid}/holdings",
                json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.0, "assetClass": "equity"},
            )

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value={"AAPL": float("nan")}),
        ):
            resp = await client.get(f"/api/v1/portfolios/{pid}/analytics")

        assert resp.status_code == 200
        _assert_all_finite(resp.json())

    async def test_analytics_market_value_used_not_undefined_name(self, client):
        # Regression test for the `total_market_value` vs `market_value`
        # NameError that used to crash this endpoint whenever a
        # portfolio actually had holdings.
        create = await client.post(
            "/api/v1/portfolios",
            json={"name": "NameError Regression", "description": "d", "currency": "USD", "benchmark": "SPY"},
        )
        pid = create.json()["id"]

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value={"AAPL": 175.0}),
        ):
            await client.post(
                f"/api/v1/portfolios/{pid}/holdings",
                json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.0, "assetClass": "equity"},
            )

            resp = await client.get(f"/api/v1/portfolios/{pid}/analytics")

        assert resp.status_code == 200
        assert resp.json()["marketValue"] == 1750.0