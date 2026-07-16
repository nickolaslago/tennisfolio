"""add tournaments.organiser

Revision ID: b8d3e5f1a2c4
Revises: 87854819d290
Create Date: 2026-07-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8d3e5f1a2c4'
down_revision: Union[str, Sequence[str], None] = '87854819d290'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tournaments', sa.Column('organiser', sa.String(length=120), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tournaments', 'organiser')
