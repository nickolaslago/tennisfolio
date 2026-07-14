"""Shared column helpers for the ORM models."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.enums import (
    AgeRange,
    Environment,
    Handedness,
    MatchStatus,
    Surface,
    TournamentType,
)


def pg_enum(enum_cls: type, name: str) -> Enum:
    """Build an ``Enum`` column type that persists the member *values*.

    Using ``values_callable`` keeps human-readable strings such as
    "Knockout Tournament" in the database instead of the Python member names.
    """
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda e: [member.value for member in e],
    )


# Reusable enum column types, one per Postgres enum created by the migration.
HANDEDNESS_ENUM = pg_enum(Handedness, "handedness")
AGE_RANGE_ENUM = pg_enum(AgeRange, "age_range")
SURFACE_ENUM = pg_enum(Surface, "surface")
ENVIRONMENT_ENUM = pg_enum(Environment, "environment")
TOURNAMENT_TYPE_ENUM = pg_enum(TournamentType, "tournament_type")
MATCH_STATUS_ENUM = pg_enum(MatchStatus, "match_status")


class TimestampMixin:
    """Adds ``created_at`` / ``updated_at`` audit columns to a model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
