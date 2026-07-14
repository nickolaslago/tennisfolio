from datetime import date

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.db import Base
from app.models import Match, Opponent, Set
from app.models.enums import (
    Environment,
    Handedness,
    MatchStatus,
    Surface,
    TournamentType,
)


@event.listens_for(Engine, "connect")
def _enable_sqlite_fks(dbapi_connection, _record) -> None:
    """SQLite ignores FK constraints unless explicitly switched on."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_all_entities_registered() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    assert set(inspect(engine).get_table_names()) == {
        "opponents",
        "clubs",
        "tournaments",
        "matches",
        "sets",
    }


def test_enum_values_are_human_readable() -> None:
    assert Handedness.RIGHT.value == "R"
    assert Surface.CLAY.value == "Clay"
    assert Environment.INDOOR.value == "Indoor"
    assert TournamentType.KNOCKOUT.value == "Knockout Tournament"
    assert MatchStatus.PLAYED.value == "played"


def test_match_type_is_derived_from_tournament() -> None:
    friendly = Match(match_date=date(2026, 7, 14), opponent_id=1)
    competitive = Match(match_date=date(2026, 7, 14), opponent_id=1, tournament_id=1)
    assert friendly.match_type == "Friendly"
    assert competitive.match_type == "Competitive"


def test_sets_cascade_when_match_deleted() -> None:
    with _session() as s:
        opp = Opponent(last_name="Nadal")
        s.add(opp)
        s.flush()
        match = Match(match_date=date(2026, 7, 14), opponent_id=opp.id)
        match.sets = [
            Set(set_no=1, games_won=6, games_lost=3),
            Set(set_no=2, games_won=6, games_lost=4),
        ]
        s.add(match)
        s.commit()

        s.delete(match)
        s.commit()
        assert s.query(Set).count() == 0
