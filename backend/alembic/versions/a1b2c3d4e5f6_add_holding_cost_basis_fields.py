"""add_holding_cost_basis_fields

Adds `avg_cost` and `asset_class` to `holdings`, and gives `weight` a
server-side default of 0. These three columns were referenced by
PortfolioService (add_holding / _to_out) and by the HoldingIn/HoldingOut
Pydantic schemas, but never existed on the ORM model or the database
table -- every call to POST /portfolios/{id}/holdings raised a
TypeError (Holding() got unexpected keyword arguments 'avg_cost',
'asset_class') before this migration.

Revision ID: a1b2c3d4e5f6
Revises: c38323b1784f
Create Date: 2026-07-04 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c38323b1784f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'holdings',
        sa.Column('avg_cost', sa.Numeric(precision=18, scale=6), nullable=True),
    )
    op.add_column(
        'holdings',
        sa.Column(
            'asset_class',
            sa.String(length=32),
            nullable=False,
            server_default='equity',
        ),
    )
    # `weight` used to be a required input field with no default. It's
    # now purely a server-computed snapshot (live weight is always
    # recalculated from market value in PortfolioService), so give it a
    # default instead of requiring callers to supply it.
    op.alter_column(
        'holdings',
        'weight',
        existing_type=sa.Numeric(precision=10, scale=6),
        server_default='0',
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'holdings',
        'weight',
        existing_type=sa.Numeric(precision=10, scale=6),
        server_default=None,
        existing_nullable=False,
    )
    op.drop_column('holdings', 'asset_class')
    op.drop_column('holdings', 'avg_cost')