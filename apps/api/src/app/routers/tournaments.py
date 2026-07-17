"""CRUD endpoints for the Tournament resource."""

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app import stats as stats_service
from app.db import DbSession
from app.models import Club, Tournament
from app.models.enums import TournamentType
from app.routers.common import get_or_404
from app.schemas.common import Page
from app.schemas.stats import StandingsRow
from app.schemas.tournament import TournamentCreate, TournamentRead, TournamentUpdate

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


def _check_club_exists(db: DbSession, club_id: int | None) -> None:
    if club_id is not None:
        get_or_404(db, Club, club_id, "Club")


@router.post("", response_model=TournamentRead, status_code=status.HTTP_201_CREATED)
def create_tournament(payload: TournamentCreate, db: DbSession) -> Tournament:
    _check_club_exists(db, payload.club_id)
    tournament = Tournament(**payload.model_dump())
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.get("", response_model=Page[TournamentRead])
def list_tournaments(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, min_length=1, description="Text search on name"),
    tournament_type: TournamentType | None = Query(
        default=None, description="Filter by tournament type"
    ),
) -> Page[TournamentRead]:
    stmt = select(Tournament)
    if search:
        stmt = stmt.where(Tournament.name.ilike(f"%{search}%"))
    if tournament_type:
        stmt = stmt.where(Tournament.tournament_type == tournament_type)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Tournament.name).limit(limit).offset(offset)).all()
    return Page(items=list(rows), total=total, limit=limit, offset=offset)


@router.get("/{tournament_id}", response_model=TournamentRead)
def get_tournament(tournament_id: int, db: DbSession) -> Tournament:
    return get_or_404(db, Tournament, tournament_id, "Tournament")


@router.get("/{tournament_id}/standings", response_model=list[StandingsRow])
def get_tournament_standings(tournament_id: int, db: DbSession) -> list[StandingsRow]:
    """Per-opponent standings for the tournament, derived on read from its matches."""
    get_or_404(db, Tournament, tournament_id, "Tournament")
    return stats_service.tournament_standings(db, tournament_id)


@router.patch("/{tournament_id}", response_model=TournamentRead)
def update_tournament(tournament_id: int, payload: TournamentUpdate, db: DbSession) -> Tournament:
    tournament = get_or_404(db, Tournament, tournament_id, "Tournament")
    data = payload.model_dump(exclude_unset=True)
    if "club_id" in data:
        _check_club_exists(db, data["club_id"])
    for field, value in data.items():
        setattr(tournament, field, value)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(tournament_id: int, db: DbSession) -> None:
    tournament = get_or_404(db, Tournament, tournament_id, "Tournament")
    db.delete(tournament)
    db.commit()
