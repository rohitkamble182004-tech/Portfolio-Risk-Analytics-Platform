"""
Integration tests for the full portfolio CRUD stack.
Uses mocked market data.
"""
# from future import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

CREATE_PAYLOAD = {
    "name": "Integration Portfolio",
    "description": "Integration Test Portfolio",
    "currency": "USD",
    "benchmark": "SPY",
}

UPDATE_PAYLOAD = {
    "name": "Integration Portfolio",
    "value": 250_000,
    "holdings": [
        {
        "ticker": "AAPL",
        "weight": 0.50,
        "quantity": 100,
        },
        {
        "ticker": "MSFT",
        "weight": 0.30,
        "quantity": 50,
        },
        {
        "ticker": "GOOGL",
        "weight": 0.20,
        "quantity": 25,
        },
    ],
}

UPDATED_PAYLOAD = {
    "name": "Updated Portfolio",
    "value": 300_000,
    "holdings": [
        {
        "ticker": "NVDA",
        "weight": 0.60,
        "quantity": 75,
        },
        {
        "ticker": "AMD",
        "weight": 0.40,
        "quantity": 150,
        },
    ],
}

MOCK_PRICES = {
    "AAPL": 175.0,
    "MSFT": 350.0,
    "GOOGL": 140.0,
    "NVDA": 800.0,
    "AMD": 160.0,
}

@pytest.mark.asyncio
class TestPortfolioCRUD:


    async def test_create_and_read(self, client):

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value=MOCK_PRICES),
        ):

            create_resp = await client.post(
                "/api/v1/portfolios",
                json=CREATE_PAYLOAD,
            )

            assert create_resp.status_code == 201

            pid = create_resp.json()["id"]

            update_resp = await client.put(
                f"/api/v1/portfolios/{pid}",
                json=UPDATE_PAYLOAD,
            )

            assert update_resp.status_code == 200

            get_resp = await client.get(
                f"/api/v1/portfolios/{pid}"
            )

            assert get_resp.status_code == 200

            data = get_resp.json()

            assert data["name"] == "Integration Portfolio"
            assert len(data["holdings"]) == 3

    async def test_list_contains_created(self, client):

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value=MOCK_PRICES),
        ):

            await client.post(
                "/api/v1/portfolios",
                json=CREATE_PAYLOAD,
            )

            resp = await client.get(
                "/api/v1/portfolios"
            )

            assert resp.status_code == 200
            assert len(resp.json()) >= 1

    async def test_update_portfolio(self, client):

        with patch(
            "app.services.portfolio_service.MarketDataService.get_latest_prices",
            AsyncMock(return_value=MOCK_PRICES),
        ):

            create_resp = await client.post(
                "/api/v1/portfolios",
                json=CREATE_PAYLOAD,
            )

            pid = create_resp.json()["id"]

            update_resp = await client.put(
                f"/api/v1/portfolios/{pid}",
                json=UPDATED_PAYLOAD,
            )

            assert update_resp.status_code == 200

            updated = update_resp.json()

            assert updated["name"] == "Updated Portfolio"
            assert updated["value"] == 300000

            tickers = [
                h["ticker"]
                for h in updated["holdings"]
            ]

            assert set(tickers) == {
                "NVDA",
                "AMD",
            }

    async def test_delete_portfolio(self, client):

        create_resp = await client.post(
            "/api/v1/portfolios",
            json=CREATE_PAYLOAD,
        )

        pid = create_resp.json()["id"]

        del_resp = await client.delete(
            f"/api/v1/portfolios/{pid}"
        )

        assert del_resp.status_code == 204

        get_resp = await client.get(
            f"/api/v1/portfolios/{pid}"
        )

        assert get_resp.status_code == 404

    async def test_get_nonexistent(self, client):

        resp = await client.get(
            f"/api/v1/portfolios/{uuid4()}"
        )

        assert resp.status_code == 404

    async def test_invalid_weights_rejected(self, client):

        create_resp = await client.post(
            "/api/v1/portfolios",
            json=CREATE_PAYLOAD,
        )

        pid = create_resp.json()["id"]

        bad_payload = {
            "name": "Bad Portfolio",
            "value": 100000,
            "holdings": [
                {
                    "ticker": "AAPL",
                    "weight": 0.50,
                },
                {
                    "ticker": "MSFT",
                    "weight": 0.20,
                },
            ],
        }

        resp = await client.put(
            f"/api/v1/portfolios/{pid}",
            json=bad_payload,
        )

        assert resp.status_code == 422

    async def test_empty_holdings_rejected(self, client):

        create_resp = await client.post(
            "/api/v1/portfolios",
            json=CREATE_PAYLOAD,
        )

        pid = create_resp.json()["id"]

        bad_payload = {
            "name": "Empty Portfolio",
            "value": 100000,
            "holdings": [],
        }

        resp = await client.put(
            f"/api/v1/portfolios/{pid}",
            json=bad_payload,
        )

        assert resp.status_code == 422



