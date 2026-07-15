"""Response schemas shared across resource routers."""

from typing import Any

from pydantic import BaseModel


class Page[ItemT](BaseModel):
    """A limit/offset page of results, with the total count of matching rows."""

    items: list[ItemT]
    total: int
    limit: int
    offset: int


class ErrorBody(BaseModel):
    message: str
    details: list[dict[str, Any]] | None = None


class ErrorResponse(BaseModel):
    """Uniform error envelope returned for every non-2xx response."""

    error: ErrorBody
