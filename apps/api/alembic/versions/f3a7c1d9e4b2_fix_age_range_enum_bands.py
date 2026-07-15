"""fix age_range enum bands to match seed data

Revision ID: f3a7c1d9e4b2
Revises: c2f5aaa3b9d7
Create Date: 2026-07-16 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a7c1d9e4b2'
down_revision: Union[str, Sequence[str], None] = 'c2f5aaa3b9d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_VALUES = ('Under 18', '18-29', '30-39', '40-49', '50-59', '60+')
NEW_VALUES = ('Under 18', '18-25', '26-35', '36-45', '46-55', '56-65', 'Over 65')


def upgrade() -> None:
    """Upgrade schema.

    The original age_range bands (18-29, 30-39, ...) didn't match the bands
    actually used by the seed data (18-25, 26-35, ...). No rows depend on the
    old bands yet, so this swaps the Postgres enum type in place rather than
    trying to remap values.
    """
    op.execute("ALTER TABLE opponents ALTER COLUMN age_range TYPE VARCHAR(20) USING age_range::text")
    op.execute("DROP TYPE age_range")
    new_enum = sa.Enum(*NEW_VALUES, name='age_range')
    new_enum.create(op.get_bind())
    op.execute("ALTER TABLE opponents ALTER COLUMN age_range TYPE age_range USING age_range::age_range")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE opponents ALTER COLUMN age_range TYPE VARCHAR(20) USING age_range::text")
    op.execute("DROP TYPE age_range")
    old_enum = sa.Enum(*OLD_VALUES, name='age_range')
    old_enum.create(op.get_bind())
    op.execute("ALTER TABLE opponents ALTER COLUMN age_range TYPE age_range USING age_range::age_range")
