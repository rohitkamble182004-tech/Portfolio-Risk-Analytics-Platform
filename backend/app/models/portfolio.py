"""SQLAlchemy ORM models for Portfolio and Holding."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0,)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    holdings: Mapped[list[Holding]] = relationship(
        "Holding", back_populates="portfolio", cascade="all, delete-orphan", lazy="selectin"
    )

    description: Mapped[str | None] = mapped_column(
    Text,
    nullable=True,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="USD",
    )

    benchmark: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    @property
    def holding_count(self) -> int:
        return len(self.holdings)


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        nullable=False,
    )

    ticker: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Numeric(18, 6),
        nullable=False,
    )

    avg_cost: Mapped[float] = mapped_column(
        Numeric(18, 6),
        nullable=False,
    )

    asset_class: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="equity",
    )

    weight: Mapped[float] = mapped_column(
        Numeric(10, 6),
        nullable=False,
        default=0,
    )

    portfolio: Mapped["Portfolio"] = relationship(
        "Portfolio",
        back_populates="holdings",
    )