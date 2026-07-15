"""add clubs.country

Revision ID: a1e6d2f8c3b9
Revises: f3a7c1d9e4b2
Create Date: 2026-07-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1e6d2f8c3b9'
down_revision: Union[str, Sequence[str], None] = 'f3a7c1d9e4b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('clubs', sa.Column('country', sa.String(length=80), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('clubs', 'country')
