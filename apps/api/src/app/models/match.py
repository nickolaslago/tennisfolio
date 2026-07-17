"""Match model — one row per match; result and score are derived, never stored."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import MATCH_STATUS_ENUM, TimestampMixin
from app.models.enums import MatchStatus

if TYPE_CHECKING:
    from app.models.club import Club
    from app.models.court import Court
    from app.models.opponent import Opponent
    from app.models.set import Set
    from app.models.tournament import Tournament


class Match(TimestampMixin, Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    opponent_id: Mapped[int] = mapped_column(
        ForeignKey("opponents.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    club_id: Mapped[int | None] = mapped_column(
        ForeignKey("clubs.id", ondelete="SET NULL"), index=True
    )
    # Nullable: a null tournament means the match is a friendly.
    tournament_id: Mapped[int | None] = mapped_column(
        ForeignKey("tournaments.id", ondelete="SET NULL"), index=True
    )
    # The specific court played on, one of the club's courts. The surface is
    # derived through it (see MatchRead) rather than stored on the match.
    court_id: Mapped[int | None] = mapped_column(
        ForeignKey("courts.id", ondelete="SET NULL"), index=True
    )
    stage: Mapped[str | None] = mapped_column(String(80))
    duration_min: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[MatchStatus] = mapped_column(
        MATCH_STATUS_ENUM,
        nullable=False,
        server_default=MatchStatus.PLAYED.value,
    )

    opponent: Mapped[Opponent] = relationship(back_populates="matches")
    club: Mapped[Club | None] = relationship(back_populates="matches")
    court: Mapped[Court | None] = relationship(back_populates="matches")
    tournament: Mapped[Tournament | None] = relationship(back_populates="matches")
    sets: Mapped[list[Set]] = relationship(
        back_populates="match",
        cascade="all, delete-orphan",
        order_by="Set.set_no",
    )

    @hybrid_property
    def match_type(self) -> str:
        """Derived: a match with no tournament is a friendly, otherwise competitive."""
        return "Friendly" if self.tournament_id is None else "Competitive"
