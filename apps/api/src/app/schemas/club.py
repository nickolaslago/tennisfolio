"""Pydantic schemas for the Club resource.

A club owns one or more courts, each a unique (surface, environment) pair.
Courts are managed inline on club create/update (see the clubs router for the
add/update/delete diffing) rather than through a standalone endpoint.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.court import CourtInput, CourtRead
from app.schemas.entity_icon import validate_entity_icon


def _reject_duplicate_courts(courts: list[CourtInput]) -> list[CourtInput]:
    seen: set[tuple[str, str]] = set()
    for court in courts:
        key = (court.surface.value, court.environment.value)
        if key in seen:
            raise ValueError(f"Duplicate court: {court.surface.value} / {court.environment.value}.")
        seen.add(key)
    return courts


class ClubBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class ClubCreate(ClubBase):
    courts: list[CourtInput] = Field(default_factory=list)

    @field_validator("courts")
    @classmethod
    def _no_duplicate_courts(cls, value: list[CourtInput]) -> list[CourtInput]:
        return _reject_duplicate_courts(value)


class ClubUpdate(BaseModel):
    """Partial update — every field is optional; only fields present are applied.

    Passing ``courts`` replaces the club's court set by diffing (courts with an
    ``id`` are updated, new ones added, and any existing court missing from the
    list is removed). Omitting ``courts`` leaves the existing courts untouched.
    """

    name: str | None = Field(default=None, min_length=1, max_length=160)
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    icon: str | None = Field(default=None, max_length=80)
    courts: list[CourtInput] | None = None

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value

    @field_validator("courts")
    @classmethod
    def _no_duplicate_courts(cls, value: list[CourtInput] | None) -> list[CourtInput] | None:
        return _reject_duplicate_courts(value) if value is not None else value


class ClubRead(ClubBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    courts: list[CourtRead]
    created_at: datetime
    updated_at: datetime
