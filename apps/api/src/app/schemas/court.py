"""Pydantic schemas for Courts, nested under the Club resource."""

from pydantic import BaseModel, ConfigDict

from app.models.enums import Environment, Surface


class CourtInput(BaseModel):
    """A court as submitted on a club create/update.

    ``id`` identifies an existing court to keep/update during update diffing;
    omit it to add a new court.
    """

    id: int | None = None
    surface: Surface
    environment: Environment


class CourtRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    surface: Surface
    environment: Environment
