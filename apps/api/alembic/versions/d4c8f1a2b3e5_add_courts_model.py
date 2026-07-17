"""add courts model, move surface/environment off clubs and matches

Introduces a ``courts`` table (a club owns many courts, each a unique
(surface, environment) pair) and points matches at a court via ``court_id``.

Data is backfilled: every club that had a surface + environment gets one
matching court, and each match is pointed at its club's court. The old
``clubs.surface`` / ``clubs.environment`` / ``matches.surface`` columns are then
dropped. Safe on an empty database — the backfill statements simply affect no
rows.

Revision ID: d4c8f1a2b3e5
Revises: b8d3e5f1a2c4
Create Date: 2026-07-17 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4c8f1a2b3e5'
down_revision: Union[str, Sequence[str], None] = 'b8d3e5f1a2c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _surface_enum() -> postgresql.ENUM:
    # Reference the enum types created by the core-schema migration; never
    # recreate them.
    return postgresql.ENUM("Hard", "Clay", "Grass", "Carpet", name="surface", create_type=False)


def _environment_enum() -> postgresql.ENUM:
    return postgresql.ENUM("Indoor", "Outdoor", name="environment", create_type=False)


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "courts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("club_id", sa.Integer(), nullable=False),
        sa.Column("surface", _surface_enum(), nullable=False),
        sa.Column("environment", _environment_enum(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "club_id", "surface", "environment", name="uq_courts_club_surface_env"
        ),
    )
    op.create_index(op.f("ix_courts_club_id"), "courts", ["club_id"], unique=False)

    op.add_column("matches", sa.Column("court_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_matches_court_id"), "matches", ["court_id"], unique=False)
    op.create_foreign_key(
        "fk_matches_court_id_courts",
        "matches",
        "courts",
        ["court_id"],
        ["id"],
        ondelete="SET NULL",
    )

    bind = op.get_bind()
    # One court per club that carried a surface + environment.
    bind.execute(
        sa.text(
            """
            INSERT INTO courts (club_id, surface, environment, created_at, updated_at)
            SELECT id, surface, environment, now(), now()
            FROM clubs
            WHERE surface IS NOT NULL AND environment IS NOT NULL
            """
        )
    )
    # Point each match at its club's (now single) court.
    bind.execute(
        sa.text(
            """
            UPDATE matches
            SET court_id = courts.id
            FROM courts
            WHERE courts.club_id = matches.club_id
            """
        )
    )

    op.drop_column("matches", "surface")
    op.drop_column("clubs", "surface")
    op.drop_column("clubs", "environment")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("clubs", sa.Column("surface", _surface_enum(), nullable=True))
    op.add_column("clubs", sa.Column("environment", _environment_enum(), nullable=True))
    op.add_column("matches", sa.Column("surface", _surface_enum(), nullable=True))

    bind = op.get_bind()
    # Restore club surface/environment from its first court.
    bind.execute(
        sa.text(
            """
            UPDATE clubs
            SET surface = c.surface, environment = c.environment
            FROM (
                SELECT DISTINCT ON (club_id) club_id, surface, environment
                FROM courts
                ORDER BY club_id, id
            ) AS c
            WHERE c.club_id = clubs.id
            """
        )
    )
    # Restore match surface from its court.
    bind.execute(
        sa.text(
            """
            UPDATE matches
            SET surface = courts.surface
            FROM courts
            WHERE courts.id = matches.court_id
            """
        )
    )

    op.drop_constraint("fk_matches_court_id_courts", "matches", type_="foreignkey")
    op.drop_index(op.f("ix_matches_court_id"), table_name="matches")
    op.drop_column("matches", "court_id")

    op.drop_index(op.f("ix_courts_club_id"), table_name="courts")
    op.drop_table("courts")
