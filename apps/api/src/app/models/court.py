"""Court model — a specific (surface, environment) combination at a club."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import ENVIRONMENT_ENUM, SURFACE_ENUM, TimestampMixin
from app.models.enums import Environment, Surface

if TYPE_CHECKING:
    from app.models.club import Club
    from app.models.match import Match


class Court(TimestampMixin, Base):
    __tablename__ = "courts"
    __table_args__ = (
        UniqueConstraint("club_id", "surface", "environment", name="uq_courts_club_surface_env"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    club_id: Mapped[int] = mapped_column(
        ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    surface: Mapped[Surface] = mapped_column(SURFACE_ENUM, nullable=False)
    environment: Mapped[Environment] = mapped_column(ENVIRONMENT_ENUM, nullable=False)

    club: Mapped[Club] = relationship(back_populates="courts")
    matches: Mapped[list[Match]] = relationship(back_populates="court")
