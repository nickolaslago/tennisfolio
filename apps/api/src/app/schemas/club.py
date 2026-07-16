"""Pydantic schemas for the Club resource."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import Environment, Surface
from app.schemas.entity_icon import validate_entity_icon


class ClubBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    surface: Surface | None = None
    environment: Environment | None = None
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    """Partial update — every field is optional; only fields present are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=160)
    city: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    surface: Surface | None = None
    environment: Environment | None = None
    icon: str | None = Field(default=None, max_length=80)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return validate_entity_icon(value) if value is not None else value


class ClubRead(ClubBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
