"""Delete-all-data: wipes every user-data table for a full reset.

Reuses app.seed_import.wipe_all, the same FK-safe delete used before a
destructive re-import in app.routers.data_import, so there is one place
that knows the correct delete order.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.db import DbSession
from app.seed_import import wipe_all

router = APIRouter(prefix="/data", tags=["data"])


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_data(db: DbSession) -> None:
    try:
        wipe_all(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
