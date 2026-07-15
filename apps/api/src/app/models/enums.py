"""Domain enums shared by the ORM models.

Each enum's *value* is what gets persisted (via ``values_callable`` on the
SQLAlchemy ``Enum`` columns), so the readable strings below are the source of
truth for the Postgres enum types.
"""

import enum


class Handedness(enum.Enum):
    """Which hand an opponent plays with."""

    RIGHT = "R"
    LEFT = "L"


class AgeRange(enum.Enum):
    """Coarse age bucket for an opponent (exact age is intentionally not tracked)."""

    UNDER_18 = "Under 18"
    A18_25 = "18-25"
    A26_35 = "26-35"
    A36_45 = "36-45"
    A46_55 = "46-55"
    A56_65 = "56-65"
    OVER_65 = "Over 65"


class Surface(enum.Enum):
    """Court surface, used both as a club default and per-match actual surface."""

    HARD = "Hard"
    CLAY = "Clay"
    GRASS = "Grass"
    CARPET = "Carpet"


class Environment(enum.Enum):
    """Whether a club's courts are indoor or outdoor."""

    INDOOR = "Indoor"
    OUTDOOR = "Outdoor"


class TournamentType(enum.Enum):
    """Competitive context a tournament provides for its matches."""

    KNOCKOUT = "Knockout Tournament"
    RANKING_LEAGUE = "Ranking League"


class MatchStatus(enum.Enum):
    """Lifecycle of a match row."""

    PLAYED = "played"
    SCHEDULED = "scheduled"
