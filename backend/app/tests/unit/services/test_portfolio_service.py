"""Unit tests for services/portfolio_service.py."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.portfolio import HoldingIn, PortfolioCreate, PortfolioIn
from app.services.portfolio_service import PortfolioService


def make_portfolio_in(name: str = "Test", value: float = 100_000) -> PortfolioIn:
    return PortfolioIn(
        name=name,
        value=value,
        holdings=[
            HoldingIn(ticker="AAPL", weight=0.6),
            HoldingIn(ticker="MSFT", weight=0.4),
        ],
    )

def make_portfolio_create():
    return PortfolioCreate(
        name="Test",
        description="Test portfolio",
        currency="USD",
        benchmark="SPY",
    )


def make_mock_portfolio(portfolio_id: uuid.UUID | None = None):
    portfolio = MagicMock()

    portfolio.id = portfolio_id or uuid.uuid4()
    portfolio.name = "Test"

    portfolio.description = "Test portfolio"
    portfolio.currency = "USD"
    portfolio.benchmark = "SPY"

    portfolio.value = 100_000.0
    portfolio.holding_count = 2

    portfolio.created_at = MagicMock()
    portfolio.updated_at = MagicMock()

    holding_a = MagicMock()
    holding_a.ticker = "AAPL"
    holding_a.weight = 0.6
    holding_a.quantity = 100

    holding_b = MagicMock()
    holding_b.ticker = "MSFT"
    holding_b.weight = 0.4
    holding_b.quantity = 50
    
    portfolio.holdings = [holding_a, holding_b]
    return portfolio


@pytest.fixture
def mock_repo():
    return MagicMock()


@pytest.fixture
def svc(mock_repo, mock_market_data_service):
    service = PortfolioService.__new__(PortfolioService)
    service._repo = mock_repo
    service._mds = mock_market_data_service
    return service


@pytest.mark.asyncio
class TestPortfolioService:
    async def test_list_portfolios(self, svc, mock_repo):
        p = make_mock_portfolio()
        mock_repo.get_all = AsyncMock(return_value=[p])
        result = await svc.list_portfolios()
        assert len(result) == 1
        assert result[0].name == "Test"

    async def test_get_portfolio_found(self, svc, mock_repo):
        pid = uuid.uuid4()
        p = make_mock_portfolio(pid)
        mock_repo.get_by_id = AsyncMock(return_value=p)
        result = await svc.get_portfolio(pid)
        assert result is not None
        assert result.id == pid

    async def test_get_portfolio_not_found(self, svc, mock_repo):
        mock_repo.get_by_id = AsyncMock(return_value=None)
        result = await svc.get_portfolio(uuid.uuid4())
        assert result is None

    async def test_create_portfolio(self, svc, mock_repo):
        p = make_mock_portfolio()
        mock_repo.create = AsyncMock(return_value=p)
        result = await svc.create_portfolio(make_portfolio_in())
        assert result.name == "Test"
        assert len(result.holdings) == 2

    async def test_update_portfolio(self, svc, mock_repo):
        pid = uuid.uuid4()
        p = make_mock_portfolio(pid)
        mock_repo.update = AsyncMock(return_value=p)
        result = await svc.update_portfolio(pid, make_portfolio_in())
        assert result is not None
        assert result.id == pid

    async def test_update_not_found(self, svc, mock_repo):
        mock_repo.update = AsyncMock(return_value=None)
        result = await svc.update_portfolio(uuid.uuid4(), make_portfolio_in())
        assert result is None

    async def test_delete_portfolio(self, svc, mock_repo):
        mock_repo.delete = AsyncMock(return_value=True)
        result = await svc.delete_portfolio(uuid.uuid4())
        assert result is True

    async def test_holdings_enriched_with_prices(self, svc, mock_repo):
        p = make_mock_portfolio()
        mock_repo.get_by_id = AsyncMock(return_value=p)
        result = await svc.get_portfolio(p.id)
        aapl = next(h for h in result.holdings if h.ticker == "AAPL")
        assert aapl.current_price == 175.0
        assert aapl.market_value is not None

    async def test_get_portfolio_analytics_found(self,svc,mock_repo,mock_market_data_service):
        pid = uuid.uuid4()

        p = make_mock_portfolio(pid)

        # quantities needed for analytics calculation
        p.holdings[0].quantity = 100
        p.holdings[1].quantity = 50

        mock_repo.get_by_id = AsyncMock(return_value=p)

        mock_repo.get_price_history = AsyncMock(
            return_value=[]
        )

        mock_market_data_service.get_latest_prices = AsyncMock(
            return_value={
                "AAPL": 200.0,
                "MSFT": 400.0,
            }
        )

        result = await svc.get_portfolio_analytics(pid)

        assert result is not None
        assert result.portfolio_id == pid
        assert result.market_value == (
            100 * 200.0
            + 50 * 400.0
        )
        assert result.holdings_count == 2

    async def test_get_portfolio_analytics_not_found(self,svc,mock_repo):
        mock_repo.get_by_id = AsyncMock(
            return_value=None
        )

        result = await svc.get_portfolio_analytics(
            uuid.uuid4()
        )

        assert result is None

    async def test_get_portfolio_analytics_empty_holdings(self,svc,mock_repo):
        p = make_mock_portfolio()

        p.holdings = []

        mock_repo.get_by_id = AsyncMock(
            return_value=p
        )

        result = await svc.get_portfolio_analytics(
            p.id
        )

        assert result.market_value == 0
        assert result.pnl == 0
        assert result.holdings_count == 0