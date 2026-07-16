"""Endpoints for /stats — win rates, streaks, tiebreak and deciding-set records.

Every metric is derived on read from matches/sets in app.stats; nothing here
is stored. All endpoints accept the same filter set (date range, surface,
opponent, club, tournament).
"""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app import stats as stats_service
from app.db import DbSession
from app.models.enums import Surface
from app.schemas.stats import (
    ClubWinRate,
    GamesRatio,
    MatchesPerMonth,
    OpponentWinRate,
    PeriodWinRate,
    RecordStat,
    StreakStats,
    SurfaceWinRate,
    TournamentWinRate,
    WinRateStat,
)
from app.stats import StatsFilters

router = APIRouter(prefix="/stats", tags=["stats"])


def stats_filters(
    date_from: date | None = Query(default=None, description="Earliest match_date, inclusive"),
    date_to: date | None = Query(default=None, description="Latest match_date, inclusive"),
    surface: Surface | None = Query(default=None),
    opponent_id: int | None = Query(default=None),
    club_id: int | None = Query(default=None),
    tournament_id: int | None = Query(default=None),
) -> StatsFilters:
    return StatsFilters(
        date_from=date_from,
        date_to=date_to,
        surface=surface,
        opponent_id=opponent_id,
        club_id=club_id,
        tournament_id=tournament_id,
    )


Filters = Annotated[StatsFilters, Depends(stats_filters)]


@router.get("/win-rate", response_model=WinRateStat)
def win_rate(db: DbSession, filters: Filters) -> WinRateStat:
    return stats_service.overall_win_rate(db, filters)


@router.get("/win-rate/by-surface", response_model=list[SurfaceWinRate])
def win_rate_by_surface(db: DbSession, filters: Filters) -> list[SurfaceWinRate]:
    return stats_service.win_rate_by_surface(db, filters)


@router.get("/win-rate/by-opponent", response_model=list[OpponentWinRate])
def win_rate_by_opponent(db: DbSession, filters: Filters) -> list[OpponentWinRate]:
    return stats_service.win_rate_by_opponent(db, filters)


@router.get("/win-rate/by-club", response_model=list[ClubWinRate])
def win_rate_by_club(db: DbSession, filters: Filters) -> list[ClubWinRate]:
    return stats_service.win_rate_by_club(db, filters)


@router.get("/win-rate/by-tournament", response_model=list[TournamentWinRate])
def win_rate_by_tournament(db: DbSession, filters: Filters) -> list[TournamentWinRate]:
    return stats_service.win_rate_by_tournament(db, filters)


@router.get("/win-rate/by-period", response_model=list[PeriodWinRate])
def win_rate_by_period(
    db: DbSession,
    filters: Filters,
    granularity: Literal["month", "season"] = Query(default="month"),
) -> list[PeriodWinRate]:
    return stats_service.win_rate_by_period(db, filters, granularity)


@router.get("/streaks", response_model=StreakStats)
def streaks(db: DbSession, filters: Filters) -> StreakStats:
    return stats_service.streaks(db, filters)


@router.get("/tiebreaks", response_model=RecordStat)
def tiebreaks(db: DbSession, filters: Filters) -> RecordStat:
    return stats_service.tiebreak_record(db, filters)


@router.get("/deciding-sets", response_model=RecordStat)
def deciding_sets(db: DbSession, filters: Filters) -> RecordStat:
    return stats_service.deciding_set_record(db, filters)


@router.get("/games", response_model=GamesRatio)
def games(db: DbSession, filters: Filters) -> GamesRatio:
    return stats_service.games_ratio(db, filters)


@router.get("/matches-per-month", response_model=list[MatchesPerMonth])
def matches_per_month(db: DbSession, filters: Filters) -> list[MatchesPerMonth]:
    return stats_service.matches_per_month(db, filters)
