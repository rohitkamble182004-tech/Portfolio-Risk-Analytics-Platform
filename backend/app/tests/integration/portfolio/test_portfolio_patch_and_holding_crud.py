"""
Integration tests for the new contract-alignment endpoints:
- PATCH /portfolios/{id}                       (partial metadata update)
- PATCH /portfolios/{id}/holdings/{holding_id} (partial holding update, by id not ticker)
- DELETE /portfolios/{id}/holdings/{holding_id}

These didn't exist before the contract audit / fix pass, so there was
no prior coverage to preserve -- this is new coverage, not a rewrite.
"""
from __future__ import annotations

import pytest


CREATE_PAYLOAD = {
    "name": "Contract Fix Portfolio",
    "description": "Covers PATCH + holding-id endpoints",
    "currency": "USD",
    "benchmark": "SPY",
}


@pytest.mark.asyncio
class TestPortfolioPatch:
    async def test_patch_updates_only_provided_fields(self, client):
        create_resp = await client.post("/api/v1/portfolios", json=CREATE_PAYLOAD)
        assert create_resp.status_code == 201
        pid = create_resp.json()["id"]

        resp = await client.patch(f"/api/v1/portfolios/{pid}", json={"name": "Renamed"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Renamed"
        # untouched fields should survive the partial update
        assert data["benchmark"] == "SPY"

    async def test_patch_missing_portfolio_404(self, client):
        resp = await client.patch(
            "/api/v1/portfolios/00000000-0000-0000-0000-000000000000",
            json={"name": "Doesn't matter"},
        )
        assert resp.status_code == 404

    async def test_patch_does_not_require_holdings(self, client):
        # This is the core bug this endpoint fixes: the frontend's
        # portfolioApi.update() never sends holdings/value, and the old
        # PUT-only endpoint required both.
        create_resp = await client.post("/api/v1/portfolios", json=CREATE_PAYLOAD)
        pid = create_resp.json()["id"]

        resp = await client.patch(f"/api/v1/portfolios/{pid}", json={"description": "Updated"})
        assert resp.status_code == 200


@pytest.mark.asyncio
class TestHoldingCrudById:
    async def test_add_holding_with_camelcase_fields(self, client):
        create_resp = await client.post("/api/v1/portfolios", json=CREATE_PAYLOAD)
        pid = create_resp.json()["id"]

        # Sent as camelCase, exactly like the real frontend does -
        # this is the field that previously never reached the backend
        # because portfolioApi.ts didn't translate it.
        resp = await client.post(
            f"/api/v1/portfolios/{pid}/holdings",
            json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.5, "assetClass": "equity"},
        )
        assert resp.status_code in (200, 201)
        holdings = resp.json()["holdings"]
        assert len(holdings) == 1
        assert holdings[0]["ticker"] == "AAPL"
        assert "id" in holdings[0] and holdings[0]["id"]

    async def test_patch_holding_by_id(self, client):
        create_resp = await client.post("/api/v1/portfolios", json=CREATE_PAYLOAD)
        pid = create_resp.json()["id"]

        add_resp = await client.post(
            f"/api/v1/portfolios/{pid}/holdings",
            json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.5, "assetClass": "equity"},
        )
        holding_id = add_resp.json()["holdings"][0]["id"]

        resp = await client.patch(
            f"/api/v1/portfolios/{pid}/holdings/{holding_id}",
            json={"quantity": 25},
        )
        assert resp.status_code == 200
        updated = next(h for h in resp.json()["holdings"] if h["id"] == holding_id)
        assert updated["quantity"] == 25

    async def test_delete_holding_by_id(self, client):
        create_resp = await client.post("/api/v1/portfolios", json=CREATE_PAYLOAD)
        pid = create_resp.json()["id"]

        add_resp = await client.post(
            f"/api/v1/portfolios/{pid}/holdings",
            json={"ticker": "AAPL", "quantity": 10, "avgCost": 150.5, "assetClass": "equity"},
        )
        holding_id = add_resp.json()["holdings"][0]["id"]

        resp = await client.delete(f"/api/v1/portfolios/{pid}/holdings/{holding_id}")
        assert resp.status_code == 200
        assert resp.json()["holdings"] == []

    async def test_patch_unknown_holding_404(self, client):
        create_resp = await client.post("/api/v1/portfolios", json=CREATE_PAYLOAD)
        pid = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/portfolios/{pid}/holdings/00000000-0000-0000-0000-000000000000",
            json={"quantity": 1},
        )
        assert resp.status_code == 404