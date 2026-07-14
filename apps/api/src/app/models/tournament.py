"""Tournament model — knockout or ranking-league context for matches."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TOURNAMENT_TYPE_ENUM, TimestampMixin
from app.models.enums import TournamentType

if TYPE_CHECKING:
    from app.models.club import Club
    from app.models.match import Match


class Tournament(TimestampMixin, Base):
    __tablename__ = "tournaments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    season: Mapped[str | None] = mapped_column(String(40))
    tournament_type: Mapped[TournamentType] = mapped_column(TOURNAMENT_TYPE_ENUM, nullable=False)
    format: Mapped[str | None] = mapped_column(String(80))
    club_id: Mapped[int | None] = mapped_column(
        ForeignKey("clubs.id", ondelete="SET NULL"), index=True
    )
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)

    club: Mapped[Club | None] = relationship(back_populates="tournaments")
    matches: Mapped[list[Match]] = relationship(back_populates="tournament")
