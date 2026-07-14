"""Set model — per-set games won/lost; a match's result aggregates from these."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.match import Match


class Set(Base):
    __tablename__ = "sets"
    __table_args__ = (UniqueConstraint("match_id", "set_no", name="uq_sets_match_id_set_no"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(
        ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    set_no: Mapped[int] = mapped_column(Integer, nullable=False)
    games_won: Mapped[int] = mapped_column(Integer, nullable=False)
    games_lost: Mapped[int] = mapped_column(Integer, nullable=False)
    tiebreak: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    match: Mapped[Match] = relationship(back_populates="sets")
