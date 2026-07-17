"""Pydantic schemas for the destructive Import feature."""

from pydantic import BaseModel


class ImportResult(BaseModel):
    """Row counts written by a wipe + replace import, plus any skipped rows."""

    clubs: int
    opponents: int
    tournaments: int
    matches: int
    sets: int
    skipped: list[str]
