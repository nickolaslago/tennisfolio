"""CRUD endpoints for the Club resource.

A club owns a set of courts, managed inline here (no standalone courts
endpoint): create accepts a nested ``courts`` list, and update diffs the
submitted list against the stored courts — updating by id, adding new ones,
and deleting any that are no longer present.
"""

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db import DbSession
from app.models import Club, Court
from app.models.enums import Environment, Surface
from app.routers.common import get_or_404
from app.schemas.club import ClubCreate, ClubRead, ClubUpdate
from app.schemas.common import Page
from app.schemas.court import CourtInput

router = APIRouter(prefix="/clubs", tags=["clubs"])


def _apply_courts(club: Club, courts: list[CourtInput]) -> None:
    """Diff ``courts`` against ``club.courts``: update by id, add new, drop the rest."""
    existing = {court.id: court for court in club.courts}
    keep_ids: set[int] = set()

    for incoming in courts:
        if incoming.id is not None and incoming.id in existing:
            court = existing[incoming.id]
            court.surface = incoming.surface
            court.environment = incoming.environment
            keep_ids.add(incoming.id)
        else:
            club.courts.append(Court(surface=incoming.surface, environment=incoming.environment))

    for court in list(club.courts):
        if court.id is not None and court.id not in keep_ids:
            club.courts.remove(court)


@router.post("", response_model=ClubRead, status_code=status.HTTP_201_CREATED)
def create_club(payload: ClubCreate, db: DbSession) -> Club:
    data = payload.model_dump(exclude={"courts"})
    club = Club(
        **data,
        courts=[
            Court(surface=court.surface, environment=court.environment) for court in payload.courts
        ],
    )
    db.add(club)
    db.commit()
    db.refresh(club)
    return club


@router.get("", response_model=Page[ClubRead])
def list_clubs(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, min_length=1, description="Text search on name"),
    surface: Surface | None = Query(default=None, description="Filter by a court's surface"),
    environment: Environment | None = Query(
        default=None, description="Filter by a court's environment"
    ),
    country: str | None = Query(default=None, description="Filter by country"),
) -> Page[ClubRead]:
    stmt = select(Club)
    if search:
        stmt = stmt.where(Club.name.ilike(f"%{search}%"))
    if country:
        stmt = stmt.where(Club.country == country)
    if surface is not None or environment is not None:
        stmt = stmt.join(Court, Court.club_id == Club.id).distinct()
        if surface is not None:
            stmt = stmt.where(Court.surface == surface)
        if environment is not None:
            stmt = stmt.where(Court.environment == environment)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(selectinload(Club.courts)).order_by(Club.name).limit(limit).offset(offset)
    ).all()
    return Page(items=list(rows), total=total, limit=limit, offset=offset)


@router.get("/{club_id}", response_model=ClubRead)
def get_club(club_id: int, db: DbSession) -> Club:
    return get_or_404(db, Club, club_id, "Club")


@router.patch("/{club_id}", response_model=ClubRead)
def update_club(club_id: int, payload: ClubUpdate, db: DbSession) -> Club:
    club = get_or_404(db, Club, club_id, "Club")
    data = payload.model_dump(exclude_unset=True, exclude={"courts"})
    for field, value in data.items():
        setattr(club, field, value)
    if payload.courts is not None:
        _apply_courts(club, payload.courts)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(club)
    return club


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(club_id: int, db: DbSession) -> None:
    club = get_or_404(db, Club, club_id, "Club")
    db.delete(club)
    db.commit()
