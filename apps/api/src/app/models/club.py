"""Club model — where you played; owns one or more courts."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.court import Court
    from app.models.match import Match
    from app.models.tournament import Tournament


class Club(TimestampMixin, Base):
    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    city: Mapped[str | None] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(80))
    icon: Mapped[str | None] = mapped_column(String(80))

    courts: Mapped[list[Court]] = relationship(
        back_populates="club",
        cascade="all, delete-orphan",
        order_by="Court.id",
    )
    matches: Mapped[list[Match]] = relationship(back_populates="club")
    tournaments: Mapped[list[Tournament]] = relationship(back_populates="club")
