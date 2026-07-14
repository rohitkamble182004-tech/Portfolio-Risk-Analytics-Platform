"""Portfolio CRUD endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.portfolio import (
    HoldingIn,
    HoldingPatch,
    PortfolioAnalytics,
    PortfolioIn,
    PortfolioOut,
    PortfolioPatch,
    PortfolioSummary,
    PortfolioCreate,
    PortfolioCreateResponse,
)
from app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


def get_portfolio_service(db: AsyncSession = Depends(get_db)) -> PortfolioService:
    return PortfolioService(session=db)


@router.get("", response_model=list[PortfolioSummary])
async def list_portfolios(
    svc: PortfolioService = Depends(get_portfolio_service),
):
    """List all saved portfolios."""
    return await svc.list_portfolios()


# @router.post("", response_model=PortfolioOut, status_code=status.HTTP_201_CREATED)
# async def create_portfolio(
#     # body: PortfolioIn,
#     body: PortfolioCreate,
#     svc: PortfolioService = Depends(get_portfolio_service),
# ):
#     """Create and persist a new portfolio."""
#     return await svc.create_portfolio(body)

@router.post(
    "",
    response_model=PortfolioCreateResponse,
    status_code=201,
)
async def create_portfolio(
    body: PortfolioCreate,
    svc: PortfolioService = Depends(get_portfolio_service),
):
    return await svc.create_portfolio(body)

@router.get("/{portfolio_id}", response_model=PortfolioOut)
async def get_portfolio(
    portfolio_id: uuid.UUID,
    svc: PortfolioService = Depends(get_portfolio_service),
):
    """Fetch a single portfolio enriched with live prices."""
    portfolio = await svc.get_portfolio(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.get(
    "/{portfolio_id}/analytics",
    response_model=PortfolioAnalytics,
)
async def get_portfolio_analytics(
    portfolio_id: uuid.UUID,
    svc: PortfolioService = Depends(
        get_portfolio_service
    ),
):
    analytics = await svc.get_portfolio_analytics(
        portfolio_id
    )

    if not analytics:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    return analytics


@router.put("/{portfolio_id}", response_model=PortfolioOut)
async def update_portfolio(
    portfolio_id: uuid.UUID,
    body: PortfolioIn,
    svc: PortfolioService = Depends(get_portfolio_service),
):
    """Replace all holdings and metadata for an existing portfolio."""
    portfolio = await svc.update_portfolio(portfolio_id, body)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.patch("/{portfolio_id}", response_model=PortfolioOut)
async def patch_portfolio(
    portfolio_id: uuid.UUID,
    body: PortfolioPatch,
    svc: PortfolioService = Depends(get_portfolio_service),
):
    """Partially update portfolio metadata (name/description/currency/benchmark).

    Does NOT touch holdings. This is what the frontend's
    portfolioApi.update() actually calls; use PUT for a full
    metadata+holdings replace instead.
    """
    portfolio = await svc.patch_portfolio(portfolio_id, body)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: uuid.UUID,
    svc: PortfolioService = Depends(get_portfolio_service),
):
    """Hard-delete a portfolio and all its holdings."""
    deleted = await svc.delete_portfolio(portfolio_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
@router.post(
    "/{portfolio_id}/holdings",
    response_model=PortfolioOut,
)
async def add_holding(
    portfolio_id: uuid.UUID,
    body: HoldingIn,
    svc: PortfolioService = Depends(
        get_portfolio_service
    ),
):
    portfolio = await svc.add_holding(
        portfolio_id,
        body,
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    return portfolio

@router.patch(
    "/{portfolio_id}/holdings/{holding_id}",
    response_model=PortfolioOut,
)
async def update_holding(
    portfolio_id: uuid.UUID,
    holding_id: uuid.UUID,
    body: HoldingPatch,
    svc: PortfolioService = Depends(
        get_portfolio_service
    ),
):
    portfolio = await svc.update_holding(
        portfolio_id,
        holding_id,
        body,
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio or holding not found",
        )

    return portfolio


@router.delete(
    "/{portfolio_id}/holdings/{holding_id}",
    response_model=PortfolioOut,
)
async def remove_holding(
    portfolio_id: uuid.UUID,
    holding_id: uuid.UUID,
    svc: PortfolioService = Depends(
        get_portfolio_service
    ),
):
    portfolio = await svc.remove_holding(
        portfolio_id,
        holding_id,
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found",
        )

    return portfolio