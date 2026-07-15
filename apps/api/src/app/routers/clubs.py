"""CRUD endpoints for the Club resource."""

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.db import DbSession
from app.models import Club
from app.routers.common import get_or_404
from app.schemas.club import ClubCreate, ClubRead, ClubUpdate
from app.schemas.common import Page

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.post("", response_model=ClubRead, status_code=status.HTTP_201_CREATED)
def create_club(payload: ClubCreate, db: DbSession) -> Club:
    club = Club(**payload.model_dump())
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
) -> Page[ClubRead]:
    stmt = select(Club)
    if search:
        stmt = stmt.where(Club.name.ilike(f"%{search}%"))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Club.name).limit(limit).offset(offset)).all()
    return Page(items=list(rows), total=total, limit=limit, offset=offset)


@router.get("/{club_id}", response_model=ClubRead)
def get_club(club_id: int, db: DbSession) -> Club:
    return get_or_404(db, Club, club_id, "Club")


@router.patch("/{club_id}", response_model=ClubRead)
def update_club(club_id: int, payload: ClubUpdate, db: DbSession) -> Club:
    club = get_or_404(db, Club, club_id, "Club")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(club, field, value)
    db.commit()
    db.refresh(club)
    return club


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(club_id: int, db: DbSession) -> None:
    club = get_or_404(db, Club, club_id, "Club")
    db.delete(club)
    db.commit()
