"""Club model — where you played."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import ENVIRONMENT_ENUM, SURFACE_ENUM, TimestampMixin
from app.models.enums import Environment, Surface

if TYPE_CHECKING:
    from app.models.match import Match
    from app.models.tournament import Tournament


class Club(TimestampMixin, Base):
    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    city: Mapped[str | None] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(80))
    surface: Mapped[Surface | None] = mapped_column(SURFACE_ENUM)
    environment: Mapped[Environment | None] = mapped_column(ENVIRONMENT_ENUM)
    icon: Mapped[str | None] = mapped_column(String(80))

    matches: Mapped[list[Match]] = relationship(back_populates="club")
    tournaments: Mapped[list[Tournament]] = relationship(back_populates="club")
