"""
Portfolio service – CRUD operations with price enrichment.
"""
from __future__ import annotations

import asyncio
import uuid

import math

import numpy as np

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import PortfolioRepository
from app.models.portfolio import Holding, Portfolio
from app.schemas.portfolio import (
    HoldingIn,
    HoldingOut,
    HoldingPatch,
    PortfolioAnalytics,
    PortfolioIn,
    PortfolioCreate,
    PortfolioOut,
    PortfolioPatch,
    PortfolioSummary,
)
from app.services.market_data_service import MarketDataService

logger = structlog.get_logger(__name__)


class PortfolioService:
    def __init__(
        self,
        session: AsyncSession,
        market_data: MarketDataService | None = None,
    ) -> None:
        self._repo = PortfolioRepository(session)
        self._mds = market_data or MarketDataService()

    async def list_portfolios(self) -> list[PortfolioSummary]:
        portfolios = await self._repo.get_all()
        return [self._to_summary(p) for p in portfolios]

    async def get_portfolio(
        self,
        portfolio_id: uuid.UUID,
    ) -> PortfolioOut | None:
        portfolio = await self._repo.get_by_id(portfolio_id)

        if not portfolio:
            return None

        return await self._to_out(portfolio)

    async def create_portfolio(
        self,
        data: PortfolioCreate,
    ):
        portfolio = await self._repo.create(data)
        return await self._to_out(portfolio)

    async def update_portfolio(
        self,
        portfolio_id: uuid.UUID,
        data: PortfolioIn,
    ) -> PortfolioOut | None:
        """Full replace: overwrites metadata AND all holdings.

        Corresponds to PUT /portfolios/{id}.
        """
        portfolio = await self._repo.update(portfolio_id, data)

        if not portfolio:
            return None

        return await self._to_out(portfolio)

    async def patch_portfolio(
        self,
        portfolio_id: uuid.UUID,
        data: "PortfolioPatch",
    ) -> PortfolioOut | None:
        """Partial update: only touches metadata fields the caller sent.

        Corresponds to PATCH /portfolios/{id}, matching
        portfolioApi.update() on the frontend.
        """
        portfolio = await self._repo.patch(
            portfolio_id,
            data.model_dump(exclude_unset=True),
        )

        if not portfolio:
            return None

        return await self._to_out(portfolio)

    async def delete_portfolio(
        self,
        portfolio_id: uuid.UUID,
    ) -> bool:
        return await self._repo.delete(portfolio_id)

    async def add_holding(
            self,
            portfolio_id: uuid.UUID,
            holding: HoldingIn,
        ) -> PortfolioOut | None:

            portfolio = await self._repo.get_by_id(
                portfolio_id
            )

            if not portfolio:
                return None

            portfolio.holdings.append(
                Holding(
                    ticker=holding.ticker,
                    quantity=holding.quantity,
                    avg_cost=holding.avg_cost,
                    asset_class=holding.asset_class,
                    weight=0,
                )
            )

            await self._repo.session.flush()
            await self._repo.session.refresh(
                portfolio
            )

            return await self._to_out(
                portfolio
            )

    async def update_holding(
            self,
            portfolio_id: uuid.UUID,
            holding_id: uuid.UUID,
            data: HoldingPatch,
        ) -> PortfolioOut | None:
            """Corresponds to PATCH /portfolios/{id}/holdings/{holding_id}."""

            portfolio = await self._repo.get_by_id(portfolio_id)

            if not portfolio:
                return None

            holding = next(
                (h for h in portfolio.holdings if h.id == holding_id),
                None,
            )

            if holding is None:
                return None

            updates = data.model_dump(exclude_unset=True)
            for field, value in updates.items():
                setattr(holding, field, value)

            await self._repo.session.flush()
            await self._repo.session.refresh(portfolio)

            return await self._to_out(portfolio)

    async def remove_holding(
            self,
            portfolio_id: uuid.UUID,
            holding_id: uuid.UUID,
        ) -> PortfolioOut | None:

            portfolio = await self._repo.get_by_id(
                portfolio_id
            )

            if not portfolio:
                return None

            portfolio.holdings = [
                h
                for h in portfolio.holdings
                if h.id != holding_id
            ]

            await self._repo.session.flush()
            await self._repo.session.refresh(
                portfolio
            )

            return await self._to_out(
                portfolio
            )

    # ─────────────────────────────────────────────────────────────
    # Conversion helpers
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _to_summary(portfolio: Portfolio) -> PortfolioSummary:
        return PortfolioSummary(
            id=portfolio.id,
            name=portfolio.name,
            value=float(portfolio.value),
            holding_count=portfolio.holding_count,
            created_at=portfolio.created_at,
            description=portfolio.description,
            currency=portfolio.currency,
            benchmark=portfolio.benchmark,
        )

    async def _to_out(self, portfolio: Portfolio) -> PortfolioOut:
        """
        Convert ORM portfolio model into API response object
        enriched with latest market prices.
        """

        # Snapshot ORM values immediately to avoid
        # async lazy-loading / MissingGreenlet issues.
        portfolio_id = portfolio.id
        portfolio_name = portfolio.name
        portfolio_value = float(portfolio.value)
        created_at = portfolio.created_at
        updated_at = portfolio.updated_at

        portfolio_description = portfolio.description
        portfolio_currency = portfolio.currency
        portfolio_benchmark = portfolio.benchmark

        holdings = list(portfolio.holdings)

        tickers = [h.ticker for h in holdings]

        try:
            latest_prices = await asyncio.wait_for(
                self._mds.get_latest_prices(tickers),
                timeout=10,
            )
        except Exception as exc:
            logger.warning(
                "Price enrichment failed",
                error=str(exc),
            )
            latest_prices = {}

        holdings_out: list[HoldingOut] = []

        for h in holdings:
            price = latest_prices.get(h.ticker)

            if (
                price is None
                or not math.isfinite(float(price))
                or h.quantity is None
            ):
                market_value = 0.0
                price = None
            else:
                market_value = (
                    float(h.quantity)
                    * float(price)
                )

            holdings_out.append(
                HoldingOut(
                    id=h.id,

                    ticker=h.ticker,

                    quantity=float(h.quantity),

                    avg_cost=float(h.avg_cost),

                    asset_class=h.asset_class,

                    current_price=price,

                    market_value=market_value,

                    weight=0,
                )
            )

        total_market_value = sum(
            h.market_value
            for h in holdings_out
            if (
                h.market_value is not None
                and math.isfinite(h.market_value)
            )
        )

        for h in holdings_out:

            if total_market_value > 0:
                h.weight = (
                    h.market_value or 0
                ) / total_market_value

            cost = h.avg_cost * h.quantity

            if (
                h.market_value is not None
                and math.isfinite(h.market_value)
            ):
                h.gain_loss = h.market_value - cost

                if not math.isfinite(h.gain_loss):
                    h.gain_loss = 0.0

                h.gain_loss_pct = (
                    h.gain_loss / cost * 100
                    if cost > 0
                    else 0.0
                )

                if not math.isfinite(h.gain_loss_pct):
                    h.gain_loss_pct = 0.0
            else:
                h.gain_loss = 0.0
                h.gain_loss_pct = 0.0

        cost_basis = sum(
            h.avg_cost * h.quantity
            for h in holdings_out
        )

        if not math.isfinite(total_market_value):
            logger.error(
                "Invalid portfolio market value",
                portfolio=portfolio_id,
                value=total_market_value,
            )
            total_market_value = 0.0

        if not math.isfinite(cost_basis):
            cost_basis = 0.0

        pnl = (
            total_market_value - cost_basis
            if total_market_value > 0
            else 0.0
        )

        if not math.isfinite(pnl):
            pnl = 0.0

        return_pct = (
            pnl / cost_basis * 100
            if cost_basis > 0
            else 0.0
        )

        if not math.isfinite(return_pct):
            return_pct = 0.0

        return PortfolioOut(
            id=portfolio_id,
            name=portfolio_name,
            description=portfolio_description,
            currency=portfolio_currency,
            benchmark=portfolio_benchmark,

            holdings=holdings_out,

            value=portfolio_value,
            market_value=total_market_value,
            pnl=pnl,
            return_pct=return_pct,

            created_at=created_at,
            updated_at=updated_at,
        )

    async def get_portfolio_analytics(
        self,
        portfolio_id: uuid.UUID,
    ) -> PortfolioAnalytics | None:

        portfolio = await self._repo.get_by_id(portfolio_id)

        if not portfolio:
            return None

        holdings = list(portfolio.holdings)

        tickers = [h.ticker for h in holdings]

        if not tickers:
            return PortfolioAnalytics(
                portfolio_id=portfolio.id,
                cost_basis=float(portfolio.value),
                market_value=0,
                pnl=0,
                return_pct=0,
                volatility=0,
                sharpe_ratio=0,
                var_95=0,
                holdings_count=0,
            )

        # -------------------------------------------------
        # Latest prices
        # -------------------------------------------------

        try:
            latest_prices = await asyncio.wait_for(
                self._mds.get_latest_prices(tickers),
                timeout=10,
            )
        except Exception as exc:
            logger.warning(
                "Price enrichment failed",
                error=str(exc),
            )
            latest_prices = {}

        market_value = 0.0

        for h in holdings:
            price = latest_prices.get(h.ticker)

            if (
                price is not None
                and math.isfinite(float(price))
                and h.quantity is not None
            ):
                market_value += (
                    float(h.quantity)
                    * float(price)
                )

        cost_basis = float(portfolio.value)

        if not math.isfinite(market_value):
            market_value = 0.0

        if not math.isfinite(cost_basis):
            cost_basis = 0.0

        pnl = market_value - cost_basis

        if not math.isfinite(pnl):
            pnl = 0.0

        return_pct = (
            pnl / cost_basis * 100
            if cost_basis > 0
            else 0.0
        )

        if not math.isfinite(return_pct):
            return_pct = 0.0

        # -------------------------------------------------
        # Historical prices
        # -------------------------------------------------

        price_rows = await self._repo.get_price_history(
            tickers
        )

        prices_by_ticker: dict[str, list[float]] = {}

        for row in price_rows:
            prices_by_ticker.setdefault(
                row.ticker,
                []
            ).append(float(row.close))

        portfolio_returns = []

        for ticker, closes in prices_by_ticker.items():

            for i in range(1, len(closes)):

                prev_close = closes[i - 1]
                current_close = closes[i]

                if prev_close == 0:
                    continue

                r = (
                    current_close
                    - prev_close
                ) / prev_close

                portfolio_returns.append(r)

        if portfolio_returns:

            returns = np.array(
                portfolio_returns
            )

            volatility = float(
                np.std(returns)
                * np.sqrt(252)
                * 100
            )

            annual_return = float(
                np.mean(returns)
                * 252
            )

            risk_free_rate = 0.05

            sharpe_ratio = (
                (annual_return - risk_free_rate)
                /
                (volatility / 100)
                if volatility > 0
                else 0
            )

            var_pct = np.percentile(
                returns,
                5
            )

            var_95 = float(
                market_value
                * abs(var_pct)
            )

            if not math.isfinite(volatility):
                volatility = 0.0

            if not math.isfinite(sharpe_ratio):
                sharpe_ratio = 0.0

            if not math.isfinite(var_95):
                var_95 = 0.0

        else:
            volatility = 0.0
            sharpe_ratio = 0.0
            var_95 = 0.0

        return PortfolioAnalytics(
            portfolio_id=portfolio.id,
            cost_basis=cost_basis,
            market_value=market_value,
            pnl=pnl,
            return_pct=return_pct,
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            var_95=var_95,
            holdings_count=len(holdings),
        )