"""SQLAlchemy ORM models for Tennisfolio.

Importing this package registers every model on ``Base.metadata`` so Alembic
autogenerate and ``create_all`` can see the full schema.
"""

from app.models.club import Club
from app.models.enums import (
    AgeRange,
    Environment,
    Handedness,
    MatchStatus,
    Surface,
    TournamentType,
)
from app.models.match import Match
from app.models.opponent import Opponent
from app.models.set import Set
from app.models.tournament import Tournament

__all__ = [
    "AgeRange",
    "Club",
    "Environment",
    "Handedness",
    "Match",
    "MatchStatus",
    "Opponent",
    "Set",
    "Surface",
    "Tournament",
    "TournamentType",
]
