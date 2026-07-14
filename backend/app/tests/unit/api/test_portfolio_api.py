"""Unit tests for /api/v1/portfolios endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.schemas.portfolio import HoldingOut, PortfolioOut, PortfolioSummary


def make_portfolio_out(pid=None) -> PortfolioOut:
    pid = pid or uuid4()
    now = datetime.now(timezone.utc)
    return PortfolioOut(
        id=pid,
        name="Tech Portfolio",
        value=100_000.0,
        holdings=[
            HoldingOut(ticker="AAPL", weight=0.6, current_price=175.0, market_value=60_000.0),
            HoldingOut(ticker="MSFT", weight=0.4, current_price=350.0, market_value=40_000.0),
        ],
        created_at=now,
        updated_at=now,
    )


def make_portfolio_summary() -> PortfolioSummary:
    now = datetime.now(timezone.utc)
    return PortfolioSummary(
        id=uuid4(), name="Tech Portfolio",
        value=100_000.0, holding_count=2, created_at=now,
    )


VALID_BODY = {
    "name": "Tech Portfolio",
    "value": 100000,
    "holdings": [
        {"ticker": "AAPL", "weight": 0.6},
        {"ticker": "MSFT", "weight": 0.4},
    ],
}


@pytest.mark.asyncio
class TestPortfolioEndpoints:
    async def test_list_empty(self, client):
        with patch("app.api.v1.portfolio.PortfolioService.list_portfolios",
                   AsyncMock(return_value=[])):
            resp = await client.get("/api/v1/portfolios")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_returns_summaries(self, client):
        summaries = [make_portfolio_summary()]
        with patch("app.api.v1.portfolio.PortfolioService.list_portfolios",
                   AsyncMock(return_value=summaries)):
            resp = await client.get("/api/v1/portfolios")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_create_portfolio(self, client):
        out = make_portfolio_out()
        with patch("app.api.v1.portfolio.PortfolioService.create_portfolio",
                   AsyncMock(return_value=out)):
            resp = await client.post("/api/v1/portfolios", json=VALID_BODY)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Tech Portfolio"

    async def test_create_weights_dont_sum_to_one(
        self,
        client,
    ):
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={
                "name": "Test Portfolio",
                "description": "Test",
                "currency": "USD",
                "benchmark": "SPY",
            },
        )
    
        assert create_resp.status_code == 201
    
        portfolio_id = create_resp.json()["id"]
    
        resp = await client.put(
            f"/api/v1/portfolios/{portfolio_id}",
            json={
                "name": "Bad Portfolio",
                "value": 100000,
                "holdings": [
                    {
                        "ticker": "AAPL",
                        "weight": 0.5,
                    },
                    {
                        "ticker": "MSFT",
                        "weight": 0.2,
                    },
                ],
            },
        )
    
        assert resp.status_code == 422

    async def test_get_portfolio_found(self, client):
        pid = uuid4()
        out = make_portfolio_out(pid)
        with patch("app.api.v1.portfolio.PortfolioService.get_portfolio",
                   AsyncMock(return_value=out)):
            resp = await client.get(f"/api/v1/portfolios/{pid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == str(pid)

    async def test_get_portfolio_not_found(self, client):
        with patch("app.api.v1.portfolio.PortfolioService.get_portfolio",
                   AsyncMock(return_value=None)):
            resp = await client.get(f"/api/v1/portfolios/{uuid4()}")
        assert resp.status_code == 404

    async def test_update_portfolio(self, client):
        pid = uuid4()
        out = make_portfolio_out(pid)
        with patch("app.api.v1.portfolio.PortfolioService.update_portfolio",
                   AsyncMock(return_value=out)):
            resp = await client.put(f"/api/v1/portfolios/{pid}", json=VALID_BODY)
        assert resp.status_code == 200

    async def test_update_not_found(self, client):
        with patch("app.api.v1.portfolio.PortfolioService.update_portfolio",
                   AsyncMock(return_value=None)):
            resp = await client.put(f"/api/v1/portfolios/{uuid4()}", json=VALID_BODY)
        assert resp.status_code == 404

    async def test_delete_portfolio(self, client):
        with patch("app.api.v1.portfolio.PortfolioService.delete_portfolio",
                   AsyncMock(return_value=True)):
            resp = await client.delete(f"/api/v1/portfolios/{uuid4()}")
        assert resp.status_code == 204

    async def test_delete_not_found(self, client):
        with patch("app.api.v1.portfolio.PortfolioService.delete_portfolio",
                   AsyncMock(return_value=False)):
            resp = await client.delete(f"/api/v1/portfolios/{uuid4()}")
        assert resp.status_code == 404