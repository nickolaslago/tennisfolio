"""Pydantic response schemas for the /stats endpoint family.

Every shape here is derived on read from matches/sets (see app/stats.py) —
nothing under /stats is stored.
"""

from typing import Literal

from pydantic import BaseModel

from app.models.enums import Surface


class WinRateStat(BaseModel):
    matches: int
    wins: int
    losses: int
    win_rate: float | None


class SurfaceWinRate(WinRateStat):
    surface: Surface


class OpponentWinRate(WinRateStat):
    opponent_id: int
    opponent_name: str


class ClubWinRate(WinRateStat):
    club_id: int
    club_name: str


class TournamentWinRate(WinRateStat):
    tournament_id: int
    tournament_name: str


class PeriodWinRate(WinRateStat):
    # "YYYY-MM" for month granularity, the tournament's season string for season granularity.
    period: str


class StreakStats(BaseModel):
    current_streak_type: Literal["Win", "Loss"] | None
    current_streak_length: int
    longest_win_streak: int
    longest_loss_streak: int


class RecordStat(BaseModel):
    """A win/loss record for a subset of played sets or matches."""

    played: int
    wins: int
    losses: int
    win_rate: float | None


class GamesRatio(BaseModel):
    games_won: int
    games_lost: int
    ratio: float | None


class MatchesPerMonth(BaseModel):
    period: str
    matches: int
