"""Helpers shared by resource routers."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db import Base


def get_or_404[ModelT: Base](
    db: Session, model: type[ModelT], object_id: int, resource_name: str
) -> ModelT:
    obj = db.get(model, object_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} {object_id} not found",
        )
    return obj
