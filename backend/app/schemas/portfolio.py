"""Pydantic schemas for portfolio API requests and responses."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class HoldingIn(BaseModel):
    ticker: str = Field(
        ...,
        min_length=1,
        max_length=10,
    )

    quantity: float = Field(
        ...,
        gt=0,
    )

    avg_cost: float = Field(
        ...,
        gt=0,
    )

    asset_class: str = Field(
        default="equity",
    )

    @field_validator("ticker")
    @classmethod
    def normalize(cls, v: str):
        return v.strip().upper()


class PortfolioIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=128, examples=["Tech Growth"])
    holdings: list[HoldingIn] = Field(..., min_length=1, max_length=50)
    value: float = Field(..., gt=0, examples=[100_000])

    # NOTE: There used to be a `weights_sum_to_one` validator here that
    # referenced `h.weight` on each holding. HoldingIn has no `weight`
    # field (holdings are defined by ticker/quantity/avg_cost; weight is
    # always derived server-side from market value), so that validator
    # raised AttributeError on every single call. It has been removed.


class PortfolioPatch(BaseModel):
    """Partial update payload for PATCH /portfolios/{id}.

    Every field is optional; only fields explicitly provided by the
    client are applied. This matches portfolioApi.update() on the
    frontend, which sends Partial<Pick<name, description, benchmark,
    currency>>.
    """

    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None
    currency: str | None = None
    benchmark: str | None = None


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None
    currency: str = "USD"
    benchmark: str | None = None

class PortfolioCreateResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    currency: str
    benchmark: str | None = None

    model_config = {"from_attributes": True}

class HoldingOut(BaseModel):
    id: UUID

    ticker: str

    quantity: float

    avg_cost: float

    asset_class: str

    current_price: float | None = None

    market_value: float | None = None

    weight: float = 0

    gain_loss: float = 0

    gain_loss_pct: float = 0


class PortfolioOut(BaseModel):
    id: UUID
    name: str
    
    description: str | None = None
    currency: str = "USD"
    benchmark: str | None = None

    holdings: list[HoldingOut]

    value: float              # cost basis
    market_value: float = 0      # current value
    pnl: float = 0
    return_pct: float = 0
    
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PortfolioSummary(BaseModel):
    id: UUID
    name: str
    value: float
    holding_count: int
    created_at: datetime
    description: str | None = None
    currency: str = "USD"
    benchmark: str | None = None

    model_config = {"from_attributes": True}

class HoldingPatch(BaseModel):
    """Partial update payload for PATCH /portfolios/{id}/holdings/{holding_id}."""

    quantity: float | None = Field(default=None, gt=0)
    avg_cost: float | None = Field(default=None, gt=0)
    asset_class: str | None = None


class PortfolioAnalytics(BaseModel):
    portfolio_id: UUID

    market_value: float
    cost_basis: float

    pnl: float
    return_pct: float

    volatility: float
    sharpe_ratio: float

    var_95: float

    holdings_count: int