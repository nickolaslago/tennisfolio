"""Pydantic schemas for the Tournament resource."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import TournamentType
from app.schemas.entity_icon import validate_entity_icon


class TournamentBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    season: str | None = Field(default=None, max_length=40)
    tournament_type: TournamentType
    format: str | None = Field(default=None, max_length=80)
    organiser: str | None = Field(default=None, max_length=120)
    club_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class TournamentCreate(TournamentBase):
    pass


class TournamentUpdate(BaseModel):
    """Partial update — every field is optional; only fields present are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=160)
    season: str | None = Field(default=None, max_length=40)
    tournament_type: TournamentType | None = None
    format: str | None = Field(default=None, max_length=80)
    organiser: str | None = Field(default=None, max_length=120)
    club_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class TournamentRead(TournamentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
