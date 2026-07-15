"""Pydantic schemas for the Match resource.

``result``, ``score`` and the per-set breakdown in :class:`MatchRead` are
derived from the stored Set rows via :mod:`app.scoring` — never stored
redundantly (see CLAUDE.md).
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import MatchStatus, Surface
from app.scoring import MatchResult, SetResult


class SetInput(BaseModel):
    """One set as entered by the user, in set order (games won first)."""

    games_won: int = Field(ge=0)
    games_lost: int = Field(ge=0)


class SetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    set_no: int
    games_won: int
    games_lost: int
    tiebreak: bool
    result: SetResult


class MatchBase(BaseModel):
    match_date: date
    opponent_id: int
    club_id: int | None = None
    tournament_id: int | None = None
    stage: str | None = Field(default=None, max_length=80)
    surface: Surface | None = None
    duration_min: int | None = Field(default=None, ge=1)
    notes: str | None = None


def _reject_score_and_sets(score: str | None, sets: list[SetInput] | None) -> None:
    if score is not None and sets is not None:
        raise ValueError("Provide either 'score' or 'sets', not both.")


class MatchCreate(MatchBase):
    """Omit both ``score`` and ``sets`` to create a scheduled match."""

    score: str | None = None
    sets: list[SetInput] | None = None

    @model_validator(mode="after")
    def _score_xor_sets(self) -> "MatchCreate":
        _reject_score_and_sets(self.score, self.sets)
        return self


class MatchUpdate(BaseModel):
    """Partial update — every field is optional; only fields present are applied.

    Providing ``score`` or ``sets`` replaces the match's sets wholesale (this is
    how a scheduled match gets completed); explicitly passing ``null`` for either
    clears the sets and reverts the match to scheduled.
    """

    match_date: date | None = None
    opponent_id: int | None = None
    club_id: int | None = None
    tournament_id: int | None = None
    stage: str | None = Field(default=None, max_length=80)
    surface: Surface | None = None
    duration_min: int | None = Field(default=None, ge=1)
    notes: str | None = None
    score: str | None = None
    sets: list[SetInput] | None = None

    @model_validator(mode="after")
    def _validate(self) -> "MatchUpdate":
        _reject_score_and_sets(self.score, self.sets)
        for field in ("match_date", "opponent_id"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"'{field}' cannot be null.")
        return self


class MatchRead(MatchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: MatchStatus
    match_type: str
    result: MatchResult | None
    score: str | None
    sets: list[SetRead]
    created_at: datetime
    updated_at: datetime
