"""CRUD endpoints for the Opponent resource."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db import DbSession
from app.models import Opponent
from app.models.enums import AgeRange, Handedness
from app.routers.common import get_or_404
from app.schemas.common import Page
from app.schemas.opponent import OpponentCreate, OpponentRead, OpponentUpdate

router = APIRouter(prefix="/opponents", tags=["opponents"])


@router.post("", response_model=OpponentRead, status_code=status.HTTP_201_CREATED)
def create_opponent(payload: OpponentCreate, db: DbSession) -> Opponent:
    opponent = Opponent(**payload.model_dump())
    db.add(opponent)
    db.commit()
    db.refresh(opponent)
    return opponent


@router.get("", response_model=Page[OpponentRead])
def list_opponents(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, min_length=1, description="Text search on name"),
    handedness: Handedness | None = Query(default=None, description="Filter by handedness"),
    age_range: AgeRange | None = Query(default=None, description="Filter by age range"),
) -> Page[OpponentRead]:
    stmt = select(Opponent)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Opponent.last_name.ilike(pattern) | Opponent.name.ilike(pattern))
    if handedness is not None:
        stmt = stmt.where(Opponent.handedness == handedness)
    if age_range is not None:
        stmt = stmt.where(Opponent.age_range == age_range)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Opponent.last_name).limit(limit).offset(offset)).all()
    return Page(items=list(rows), total=total, limit=limit, offset=offset)


@router.get("/{opponent_id}", response_model=OpponentRead)
def get_opponent(opponent_id: int, db: DbSession) -> Opponent:
    return get_or_404(db, Opponent, opponent_id, "Opponent")


@router.patch("/{opponent_id}", response_model=OpponentRead)
def update_opponent(opponent_id: int, payload: OpponentUpdate, db: DbSession) -> Opponent:
    opponent = get_or_404(db, Opponent, opponent_id, "Opponent")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(opponent, field, value)
    db.commit()
    db.refresh(opponent)
    return opponent


@router.delete("/{opponent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opponent(opponent_id: int, db: DbSession) -> None:
    opponent = get_or_404(db, Opponent, opponent_id, "Opponent")
    db.delete(opponent)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Opponent {opponent_id} has matches and cannot be deleted",
        ) from exc
