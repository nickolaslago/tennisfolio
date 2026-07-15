"""Pydantic schemas for the Tournament resource."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TournamentType


class TournamentBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    season: str | None = Field(default=None, max_length=40)
    tournament_type: TournamentType
    format: str | None = Field(default=None, max_length=80)
    club_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class TournamentCreate(TournamentBase):
    pass


class TournamentUpdate(BaseModel):
    """Partial update — every field is optional; only fields present are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=160)
    season: str | None = Field(default=None, max_length=40)
    tournament_type: TournamentType | None = None
    format: str | None = Field(default=None, max_length=80)
    club_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class TournamentRead(TournamentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
