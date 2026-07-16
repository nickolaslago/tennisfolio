"""Stats aggregation — every metric is derived from matches/sets on read.

All aggregation happens in SQL (SQLAlchemy GROUP BY / window functions); no
endpoint here loads full row sets into Python to reduce them.

A match's result and games are derived from its ``Set`` rows the same way
``app.scoring`` does, but re-expressed as a SQL aggregate: for each match,
sum the sets/games won and lost, then compare. Only matches that have at
least one recorded set (i.e. played, not merely scheduled) are considered.

The "deciding set" record assumes any match that ran past two sets went the
distance (loser took at least one set), which is exactly right for
best-of-three and treats a best-of-five straight-sets sweep as a decider too
— an accepted simplification given the app does not track per-match format.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Literal

from sqlalchemy import Select, case, extract, func, literal, select
from sqlalchemy.orm import Session

from app.models import Club, Match, Opponent, Set, Tournament
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

WIN: Literal["Win"] = "Win"
LOSS: Literal["Loss"] = "Loss"


@dataclass
class StatsFilters:
    date_from: date | None = None
    date_to: date | None = None
    surface: Surface | None = None
    opponent_id: int | None = None
    club_id: int | None = None
    tournament_id: int | None = None


def _set_agg_subquery():
    """Per-match set/game totals, aggregated from Set rows."""
    return (
        select(
            Set.match_id.label("match_id"),
            func.sum(case((Set.games_won > Set.games_lost, 1), else_=0)).label("sets_won"),
            func.sum(case((Set.games_won < Set.games_lost, 1), else_=0)).label("sets_lost"),
            func.sum(Set.games_won).label("games_won"),
            func.sum(Set.games_lost).label("games_lost"),
            func.max(Set.set_no).label("total_sets"),
        )
        .group_by(Set.match_id)
        .subquery()
    )


def _played_matches(filters: StatsFilters) -> Select:
    """Every played match (has recorded sets) with its derived result, filtered."""
    sets_agg = _set_agg_subquery()
    result_expr = case(
        (sets_agg.c.sets_won > sets_agg.c.sets_lost, literal(WIN)), else_=literal(LOSS)
    )

    stmt = select(
        Match.id.label("match_id"),
        Match.match_date.label("match_date"),
        Match.surface.label("surface"),
        Match.opponent_id.label("opponent_id"),
        Match.club_id.label("club_id"),
        Match.tournament_id.label("tournament_id"),
        sets_agg.c.sets_won,
        sets_agg.c.sets_lost,
        sets_agg.c.games_won,
        sets_agg.c.games_lost,
        sets_agg.c.total_sets,
        result_expr.label("result"),
    ).join(sets_agg, sets_agg.c.match_id == Match.id)

    if filters.date_from is not None:
        stmt = stmt.where(Match.match_date >= filters.date_from)
    if filters.date_to is not None:
        stmt = stmt.where(Match.match_date <= filters.date_to)
    if filters.surface is not None:
        stmt = stmt.where(Match.surface == filters.surface)
    if filters.opponent_id is not None:
        stmt = stmt.where(Match.opponent_id == filters.opponent_id)
    if filters.club_id is not None:
        stmt = stmt.where(Match.club_id == filters.club_id)
    if filters.tournament_id is not None:
        stmt = stmt.where(Match.tournament_id == filters.tournament_id)
    return stmt


def _win_rate_columns(subq):
    matches = func.count()
    wins = func.sum(case((subq.c.result == WIN, 1), else_=0))
    return matches, wins


def _win_rate_kwargs(matches: int, wins: int) -> dict:
    losses = matches - wins
    return {
        "matches": matches,
        "wins": wins,
        "losses": losses,
        "win_rate": wins / matches if matches else None,
    }


def _record_kwargs(played: int, wins: int) -> dict:
    losses = played - wins
    return {
        "played": played,
        "wins": wins,
        "losses": losses,
        "win_rate": wins / played if played else None,
    }


def overall_win_rate(db: Session, filters: StatsFilters) -> WinRateStat:
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)
    row = db.execute(select(matches.label("matches"), wins.label("wins")).select_from(subq)).one()
    return WinRateStat(**_win_rate_kwargs(row.matches, row.wins or 0))


def win_rate_by_surface(db: Session, filters: StatsFilters) -> list[SurfaceWinRate]:
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)
    rows = db.execute(
        select(subq.c.surface, matches.label("matches"), wins.label("wins"))
        .select_from(subq)
        .where(subq.c.surface.is_not(None))
        .group_by(subq.c.surface)
        .order_by(subq.c.surface)
    ).all()
    return [
        SurfaceWinRate(surface=row.surface, **_win_rate_kwargs(row.matches, row.wins or 0))
        for row in rows
    ]


def win_rate_by_opponent(db: Session, filters: StatsFilters) -> list[OpponentWinRate]:
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)
    rows = db.execute(
        select(
            Opponent.id.label("opponent_id"),
            Opponent.name.label("name"),
            Opponent.last_name.label("last_name"),
            matches.label("matches"),
            wins.label("wins"),
        )
        .select_from(subq)
        .join(Opponent, Opponent.id == subq.c.opponent_id)
        .group_by(Opponent.id, Opponent.name, Opponent.last_name)
        .order_by(Opponent.last_name)
    ).all()
    return [
        OpponentWinRate(
            opponent_id=row.opponent_id,
            opponent_name=f"{row.name} {row.last_name}" if row.name else row.last_name,
            **_win_rate_kwargs(row.matches, row.wins or 0),
        )
        for row in rows
    ]


def win_rate_by_club(db: Session, filters: StatsFilters) -> list[ClubWinRate]:
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)
    rows = db.execute(
        select(
            Club.id.label("club_id"),
            Club.name.label("club_name"),
            matches.label("matches"),
            wins.label("wins"),
        )
        .select_from(subq)
        .join(Club, Club.id == subq.c.club_id)
        .group_by(Club.id, Club.name)
        .order_by(Club.name)
    ).all()
    return [
        ClubWinRate(
            club_id=row.club_id,
            club_name=row.club_name,
            **_win_rate_kwargs(row.matches, row.wins or 0),
        )
        for row in rows
    ]


def win_rate_by_tournament(db: Session, filters: StatsFilters) -> list[TournamentWinRate]:
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)
    rows = db.execute(
        select(
            Tournament.id.label("tournament_id"),
            Tournament.name.label("tournament_name"),
            matches.label("matches"),
            wins.label("wins"),
        )
        .select_from(subq)
        .join(Tournament, Tournament.id == subq.c.tournament_id)
        .group_by(Tournament.id, Tournament.name)
        .order_by(Tournament.name)
    ).all()
    return [
        TournamentWinRate(
            tournament_id=row.tournament_id,
            tournament_name=row.tournament_name,
            **_win_rate_kwargs(row.matches, row.wins or 0),
        )
        for row in rows
    ]


def win_rate_by_period(
    db: Session, filters: StatsFilters, granularity: Literal["month", "season"]
) -> list[PeriodWinRate]:
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)

    if granularity == "season":
        rows = db.execute(
            select(
                Tournament.season.label("period"),
                matches.label("matches"),
                wins.label("wins"),
            )
            .select_from(subq)
            .join(Tournament, Tournament.id == subq.c.tournament_id)
            .where(Tournament.season.is_not(None))
            .group_by(Tournament.season)
            .order_by(Tournament.season)
        ).all()
        return [
            PeriodWinRate(period=row.period, **_win_rate_kwargs(row.matches, row.wins or 0))
            for row in rows
        ]

    year = extract("year", subq.c.match_date)
    month = extract("month", subq.c.match_date)
    rows = db.execute(
        select(
            year.label("year"), month.label("month"), matches.label("matches"), wins.label("wins")
        )
        .select_from(subq)
        .group_by(year, month)
        .order_by(year, month)
    ).all()
    return [
        PeriodWinRate(
            period=f"{int(row.year):04d}-{int(row.month):02d}",
            **_win_rate_kwargs(row.matches, row.wins or 0),
        )
        for row in rows
    ]


def streaks(db: Session, filters: StatsFilters) -> StreakStats:
    subq = _played_matches(filters).subquery()

    numbered = select(
        subq.c.match_id,
        subq.c.match_date,
        subq.c.result,
        func.row_number().over(order_by=(subq.c.match_date, subq.c.match_id)).label("rn_all"),
        func.row_number()
        .over(partition_by=subq.c.result, order_by=(subq.c.match_date, subq.c.match_id))
        .label("rn_result"),
    ).subquery()

    grp = (numbered.c.rn_all - numbered.c.rn_result).label("grp")
    grouped = (
        select(
            numbered.c.result,
            grp,
            func.count().label("length"),
            func.max(numbered.c.match_date).label("last_date"),
            func.max(numbered.c.match_id).label("last_match_id"),
        )
        .select_from(numbered)
        .group_by(numbered.c.result, grp)
        .subquery()
    )

    longest_row = db.execute(
        select(
            func.max(case((grouped.c.result == WIN, grouped.c.length), else_=0)).label(
                "longest_win"
            ),
            func.max(case((grouped.c.result == LOSS, grouped.c.length), else_=0)).label(
                "longest_loss"
            ),
        )
    ).one()

    current_row = db.execute(
        select(grouped.c.result, grouped.c.length)
        .order_by(grouped.c.last_date.desc(), grouped.c.last_match_id.desc())
        .limit(1)
    ).first()

    return StreakStats(
        current_streak_type=current_row.result if current_row else None,
        current_streak_length=current_row.length if current_row else 0,
        longest_win_streak=longest_row.longest_win or 0,
        longest_loss_streak=longest_row.longest_loss or 0,
    )


def tiebreak_record(db: Session, filters: StatsFilters) -> RecordStat:
    subq = _played_matches(filters).subquery()
    row = db.execute(
        select(
            func.count().label("played"),
            func.sum(case((Set.games_won > Set.games_lost, 1), else_=0)).label("wins"),
        )
        .select_from(Set)
        .join(subq, subq.c.match_id == Set.match_id)
        .where(Set.tiebreak.is_(True))
    ).one()
    return RecordStat(**_record_kwargs(row.played or 0, row.wins or 0))


def deciding_set_record(db: Session, filters: StatsFilters) -> RecordStat:
    """Record in matches that went the distance — see module docstring for the heuristic."""
    subq = _played_matches(filters).subquery()
    matches, wins = _win_rate_columns(subq)
    row = db.execute(
        select(matches.label("played"), wins.label("wins"))
        .select_from(subq)
        .where(subq.c.total_sets >= 3)
    ).one()
    return RecordStat(**_record_kwargs(row.played or 0, row.wins or 0))


def games_ratio(db: Session, filters: StatsFilters) -> GamesRatio:
    subq = _played_matches(filters).subquery()
    row = db.execute(
        select(
            func.coalesce(func.sum(subq.c.games_won), 0).label("games_won"),
            func.coalesce(func.sum(subq.c.games_lost), 0).label("games_lost"),
        ).select_from(subq)
    ).one()
    ratio = row.games_won / row.games_lost if row.games_lost else None
    return GamesRatio(games_won=row.games_won, games_lost=row.games_lost, ratio=ratio)


def matches_per_month(db: Session, filters: StatsFilters) -> list[MatchesPerMonth]:
    subq = _played_matches(filters).subquery()
    year = extract("year", subq.c.match_date)
    month = extract("month", subq.c.match_date)
    rows = db.execute(
        select(year.label("year"), month.label("month"), func.count().label("matches"))
        .select_from(subq)
        .group_by(year, month)
        .order_by(year, month)
    ).all()
    return [
        MatchesPerMonth(period=f"{int(row.year):04d}-{int(row.month):02d}", matches=row.matches)
        for row in rows
    ]
