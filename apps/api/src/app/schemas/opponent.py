"""Pydantic schemas for the Opponent resource."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AgeRange, Handedness
from app.schemas.entity_icon import validate_entity_icon


class OpponentBase(BaseModel):
    last_name: str = Field(min_length=1, max_length=120)
    name: str | None = Field(default=None, max_length=120)
    nationality: str | None = Field(default=None, max_length=80)
    handedness: Handedness | None = None
    age_range: AgeRange | None = None
    level: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class OpponentCreate(OpponentBase):
    pass


class OpponentUpdate(BaseModel):
    """Partial update — every field is optional; only fields present are applied."""

    last_name: str | None = Field(default=None, min_length=1, max_length=120)
    name: str | None = Field(default=None, max_length=120)
    nationality: str | None = Field(default=None, max_length=80)
    handedness: Handedness | None = None
    age_range: AgeRange | None = None
    level: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class OpponentRead(OpponentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
