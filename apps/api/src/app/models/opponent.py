"""Opponent model — who you played."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import AGE_RANGE_ENUM, HANDEDNESS_ENUM, TimestampMixin
from app.models.enums import AgeRange, Handedness

if TYPE_CHECKING:
    from app.models.match import Match


class Opponent(TimestampMixin, Base):
    __tablename__ = "opponents"

    id: Mapped[int] = mapped_column(primary_key=True)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(120))
    nationality: Mapped[str | None] = mapped_column(String(80))
    handedness: Mapped[Handedness | None] = mapped_column(HANDEDNESS_ENUM)
    age_range: Mapped[AgeRange | None] = mapped_column(AGE_RANGE_ENUM)
    level: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)

    matches: Mapped[list[Match]] = relationship(back_populates="opponent")
