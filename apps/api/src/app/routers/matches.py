"""Endpoints for the Match resource.

A match's result, score string and set breakdown are derived from its Set rows
via :mod:`app.scoring` on every response. Create/update accepts either nested
sets or a score string; both are validated by the same parser before anything
is written, and the Match plus its Sets go to the database in one transaction.
"""

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db import DbSession
from app.models import Club, Match, Opponent, Set, Tournament
from app.models.enums import MatchStatus, Surface
from app.routers.common import get_or_404
from app.schemas.common import Page
from app.schemas.match import MatchCreate, MatchRead, MatchUpdate, SetInput, SetRead
from app.scoring import (
    InvalidScoreError,
    ScoredSet,
    compute_match_result,
    format_score,
    parse_score,
)

router = APIRouter(prefix="/matches", tags=["matches"])


def _parse_sets(score: str | None, sets: list[SetInput] | None) -> list[ScoredSet]:
    """Validate either input form through the one canonical parser.

    Nested sets are normalised to a score string first, so both forms are held
    to exactly the same rules and produce identical derived data.
    """
    if score is None:
        score = " ".join(f"{s.games_won}-{s.games_lost}" for s in sets or [])
    try:
        return parse_score(score)
    except InvalidScoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc


def _check_related_exist(db: DbSession, data: dict) -> None:
    """404 on any referenced row that doesn't exist, before anything is written."""
    if "opponent_id" in data:
        get_or_404(db, Opponent, data["opponent_id"], "Opponent")
    if data.get("club_id") is not None:
        get_or_404(db, Club, data["club_id"], "Club")
    if data.get("tournament_id") is not None:
        get_or_404(db, Tournament, data["tournament_id"], "Tournament")


def _set_rows(scored: list[ScoredSet]) -> list[Set]:
    return [
        Set(
            set_no=scored_set.set_no,
            games_won=scored_set.games_won,
            games_lost=scored_set.games_lost,
            tiebreak=scored_set.tiebreak,
        )
        for scored_set in scored
    ]


def _to_read(match: Match) -> MatchRead:
    """Assemble the response, deriving result/score/breakdown from the Set rows."""
    scored = [
        ScoredSet(
            set_no=row.set_no,
            games_won=row.games_won,
            games_lost=row.games_lost,
            tiebreak=row.tiebreak,
            result="Win" if row.games_won > row.games_lost else "Loss",
        )
        for row in match.sets
    ]
    return MatchRead(
        id=match.id,
        match_date=match.match_date,
        opponent_id=match.opponent_id,
        club_id=match.club_id,
        tournament_id=match.tournament_id,
        stage=match.stage,
        surface=match.surface,
        duration_min=match.duration_min,
        notes=match.notes,
        status=match.status,
        match_type=match.match_type,
        result=compute_match_result(scored) if scored else None,
        score=format_score(scored) if scored else None,
        sets=[SetRead.model_validate(scored_set) for scored_set in scored],
        created_at=match.created_at,
        updated_at=match.updated_at,
    )


@router.post("", response_model=MatchRead, status_code=status.HTTP_201_CREATED)
def create_match(payload: MatchCreate, db: DbSession) -> MatchRead:
    data = payload.model_dump(exclude={"score", "sets"})
    _check_related_exist(db, data)

    has_result = payload.score is not None or payload.sets is not None
    scored = _parse_sets(payload.score, payload.sets) if has_result else []

    match = Match(
        **data,
        status=MatchStatus.PLAYED if scored else MatchStatus.SCHEDULED,
        sets=_set_rows(scored),
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return _to_read(match)


@router.get("", response_model=Page[MatchRead])
def list_matches(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    opponent_id: int | None = Query(default=None),
    club_id: int | None = Query(default=None),
    tournament_id: int | None = Query(default=None),
    surface: Surface | None = Query(default=None),
    match_status: MatchStatus | None = Query(
        default=None, alias="status", description="played or scheduled"
    ),
    date_from: date | None = Query(default=None, description="Earliest match_date, inclusive"),
    date_to: date | None = Query(default=None, description="Latest match_date, inclusive"),
) -> Page[MatchRead]:
    stmt = select(Match)
    if opponent_id is not None:
        stmt = stmt.where(Match.opponent_id == opponent_id)
    if club_id is not None:
        stmt = stmt.where(Match.club_id == club_id)
    if tournament_id is not None:
        stmt = stmt.where(Match.tournament_id == tournament_id)
    if surface is not None:
        stmt = stmt.where(Match.surface == surface)
    if match_status is not None:
        stmt = stmt.where(Match.status == match_status)
    if date_from is not None:
        stmt = stmt.where(Match.match_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Match.match_date <= date_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(selectinload(Match.sets))
        .order_by(Match.match_date.desc(), Match.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return Page(items=[_to_read(m) for m in rows], total=total, limit=limit, offset=offset)


@router.get("/{match_id}", response_model=MatchRead)
def get_match(match_id: int, db: DbSession) -> MatchRead:
    return _to_read(get_or_404(db, Match, match_id, "Match"))


@router.patch("/{match_id}", response_model=MatchRead)
def update_match(match_id: int, payload: MatchUpdate, db: DbSession) -> MatchRead:
    match = get_or_404(db, Match, match_id, "Match")
    data = payload.model_dump(exclude_unset=True)
    score_touched = "score" in data or "sets" in data
    data.pop("score", None)
    data.pop("sets", None)
    _check_related_exist(db, data)

    if score_touched:
        if payload.score is None and payload.sets is None:
            # Explicit null: clear the result and revert to scheduled.
            match.sets = []
            match.status = MatchStatus.SCHEDULED
        else:
            scored = _parse_sets(payload.score, payload.sets)
            match.sets = []
            # Flush the orphaned rows so re-inserted set numbers don't
            # transiently collide on (match_id, set_no); still one transaction.
            db.flush()
            match.sets = _set_rows(scored)
            match.status = MatchStatus.PLAYED

    for field, value in data.items():
        setattr(match, field, value)
    db.commit()
    db.refresh(match)
    return _to_read(match)


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(match_id: int, db: DbSession) -> None:
    match = get_or_404(db, Match, match_id, "Match")
    db.delete(match)
    db.commit()
