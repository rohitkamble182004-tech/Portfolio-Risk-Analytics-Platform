"""Repository layer – thin async wrappers around SQLAlchemy queries."""
from __future__ import annotations

import uuid

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.portfolio import Portfolio, Holding
from app.schemas.portfolio import PortfolioIn,PortfolioCreate

from app.models.market import DailyPrice



class PortfolioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    @property
    def session(self) -> AsyncSession:
        """Public accessor for the underlying session. PortfolioService
        uses this directly for commit()/refresh() around holding
        mutations that don't go through a dedicated repository method."""
        return self._s

    async def get_all(self) -> list[Portfolio]:
        result = await self._s.execute(
            select(Portfolio).options(selectinload(Portfolio.holdings)).order_by(Portfolio.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, portfolio_id: uuid.UUID) -> Portfolio | None:
        result = await self._s.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.holdings))
            .where(Portfolio.id == portfolio_id)
        )
        return result.scalar_one_or_none()
    
    async def get_price_history(
    self,
        tickers: list[str],
    ):
        result = await self._s.execute(
            select(DailyPrice)
            .where(DailyPrice.ticker.in_(tickers))
            .order_by(
                DailyPrice.ticker,
                DailyPrice.date,
            )
        )
    
        return result.scalars().all()

    # async def create(self, data: PortfolioIn) -> Portfolio:
    #     portfolio = Portfolio(name=data.name, value=data.value)
    #     portfolio.holdings = [
    #         Holding(
    #             ticker=h.ticker,
    #             weight=h.weight,
    #             quantity=h.quantity,
    #         )
    #         for h in data.holdings
    #     ]
    #     self._s.add(portfolio)
    #     await self._s.flush()
    #     await self._s.refresh(portfolio)
    #     return portfolio
    
    async def create(self,data: PortfolioCreate,) -> Portfolio:
        portfolio = Portfolio(
            name=data.name,
            description=data.description,
            currency=data.currency,
            benchmark=data.benchmark,
            value=0,
        )
        self._s.add(portfolio)
        await self._s.flush()
        await self._s.refresh(portfolio)
        return portfolio

    async def update(self, portfolio_id: uuid.UUID, data: PortfolioIn) -> Portfolio | None:
        """Full replace of metadata + holdings (PUT semantics)."""
        portfolio = await self.get_by_id(portfolio_id)
        if not portfolio:
            return None
        portfolio.name = data.name
        portfolio.value = data.value
        # replace holdings
        await self._s.execute(delete(Holding).where(Holding.portfolio_id == portfolio_id))
        portfolio.holdings = [
            Holding(
                portfolio_id=portfolio.id,
                ticker=h.ticker,
                quantity=h.quantity,
                avg_cost=h.avg_cost,
                asset_class=h.asset_class,
            )
            for h in data.holdings
        ]
        await self._s.flush()
        await self._s.refresh(portfolio)
        return portfolio

    async def patch(
        self,
        portfolio_id: uuid.UUID,
        fields: dict,
    ) -> Portfolio | None:
        """Partial update of metadata only (PATCH semantics). `fields`
        should already be filtered to only the keys the caller set
        (e.g. via Pydantic's `model_dump(exclude_unset=True)`)."""
        portfolio = await self.get_by_id(portfolio_id)
        if not portfolio:
            return None
        for key, value in fields.items():
            setattr(portfolio, key, value)
        await self._s.flush()
        await self._s.refresh(portfolio)
        return portfolio


    async def delete(self, portfolio_id: uuid.UUID) -> bool:
        portfolio = await self.get_by_id(portfolio_id)
    
        if not portfolio:
            return False
    
        await self._s.delete(portfolio)
    
        # IMPORTANT:
        # push delete to DB inside current transaction
        await self._s.flush()
    
        return True