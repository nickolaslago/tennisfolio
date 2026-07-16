"""add entity icons

Revision ID: 87854819d290
Revises: a1e6d2f8c3b9
Create Date: 2026-07-16 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87854819d290'
down_revision: Union[str, Sequence[str], None] = 'a1e6d2f8c3b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('opponents', sa.Column('icon', sa.String(length=80), nullable=True))
    op.add_column('clubs', sa.Column('icon', sa.String(length=80), nullable=True))
    op.add_column('tournaments', sa.Column('icon', sa.String(length=80), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tournaments', 'icon')
    op.drop_column('clubs', 'icon')
    op.drop_column('opponents', 'icon')
