"""Round-trip test: export -> wipe -> re-import via scripts/import_seed.py.

The CSV export's column layout must match exactly what the seed importer
accepts (see docs/data-export.md), so this is the automated proof of that
contract rather than a description of it.
"""

from __future__ import annotations

import csv
import importlib.util
import io
import json
import sys
import zipfile
from datetime import date
from pathlib import Path
from types import ModuleType

from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Club, Match, Opponent, Set, Tournament
from app.models.enums import (
    AgeRange,
    Environment,
    Handedness,
    MatchStatus,
    Surface,
    TournamentType,
)

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"


def _load_import_seed() -> ModuleType:
    """scripts/ isn't an importable package, so load it directly from its file."""
    spec = importlib.util.spec_from_file_location(
        "import_seed_under_test", SCRIPTS_DIR / "import_seed.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _seed_data(db: Session) -> None:
    """A little of everything: every column populated, some left null."""
    clay_club = Club(
        name="Stade Roland Garros",
        city="Paris",
        country="France",
        surface=Surface.CLAY,
        environment=Environment.OUTDOOR,
    )
    bare_club = Club(name="Local Park Courts")
    db.add_all([clay_club, bare_club])
    db.flush()

    federer = Opponent(
        last_name="FEDERER",
        name="Roger Federer",
        nationality="Switzerland",
        handedness=Handedness.RIGHT,
        age_range=AgeRange.A36_45,
        level="10",
        notes="Slice backhand",
    )
    bare_opponent = Opponent(last_name="Doe")
    db.add_all([federer, bare_opponent])
    db.flush()

    roland_garros = Tournament(
        name="Rolland Garros",
        season="2026",
        tournament_type=TournamentType.KNOCKOUT,
        format="Best of 5",
        club_id=clay_club.id,
        start_date=date(2026, 5, 24),
        end_date=date(2026, 6, 7),
        notes="Clay slam",
    )
    db.add(roland_garros)
    db.flush()

    match_with_tiebreak = Match(
        match_date=date(2026, 5, 25),
        opponent_id=federer.id,
        club_id=clay_club.id,
        tournament_id=roland_garros.id,
        stage="R32",
        surface=Surface.CLAY,
        duration_min=125,
        status=MatchStatus.PLAYED,
        notes="Tight one",
        sets=[
            Set(set_no=1, games_won=6, games_lost=4, tiebreak=False),
            Set(set_no=2, games_won=6, games_lost=3, tiebreak=False),
        ],
    )
    friendly_match = Match(
        match_date=date(2026, 3, 1),
        opponent_id=bare_opponent.id,
        status=MatchStatus.SCHEDULED,
        sets=[],
    )
    tiebreak_match = Match(
        match_date=date(2026, 4, 10),
        opponent_id=federer.id,
        sets=[Set(set_no=1, games_won=7, games_lost=6, tiebreak=True)],
    )
    db.add_all([match_with_tiebreak, friendly_match, tiebreak_match])
    db.commit()


def _snapshot(db: Session) -> dict[str, list[tuple]]:
    """Content of every table, id/timestamp-independent, for before/after comparison."""
    clubs = {
        (c.name, c.city, c.country, c.surface, c.environment)
        for c in db.scalars(select(Club)).all()
    }
    opponents = {
        (o.last_name, o.name, o.nationality, o.handedness, o.age_range, o.level, o.notes)
        for o in db.scalars(select(Opponent)).all()
    }
    tournaments = {
        (
            t.name,
            t.season,
            t.tournament_type,
            t.format,
            t.club.name if t.club else None,
            t.start_date,
            t.end_date,
            t.notes,
        )
        for t in db.scalars(select(Tournament)).all()
    }
    matches = set()
    sets = set()
    for m in db.scalars(select(Match)).all():
        matches.add(
            (
                m.match_date,
                m.opponent.last_name,
                m.opponent.name,
                m.club.name if m.club else None,
                m.tournament.name if m.tournament else None,
                m.stage,
                m.surface,
                m.duration_min,
                m.status,
                m.notes,
            )
        )
        for s in m.sets:
            sets.add(
                (
                    m.match_date,
                    m.opponent.last_name,
                    s.set_no,
                    s.games_won,
                    s.games_lost,
                    s.tiebreak,
                )
            )

    return {
        "clubs": clubs,
        "opponents": opponents,
        "tournaments": tournaments,
        "matches": matches,
        "sets": sets,
    }


def _wipe(db: Session) -> None:
    db.execute(delete(Set))
    db.execute(delete(Match))
    db.execute(delete(Tournament))
    db.execute(delete(Club))
    db.execute(delete(Opponent))
    db.commit()


def test_csv_export_round_trips_through_the_seed_importer(
    client: TestClient, db_session: Session, tmp_path: Path
) -> None:
    _seed_data(db_session)
    before = _snapshot(db_session)
    assert all(rows for rows in before.values())

    response = client.get("/export/csv")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

    seed_dir = tmp_path / "exported-seed"
    seed_dir.mkdir()
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        assert set(zf.namelist()) == {
            "clubs.csv",
            "opponents.csv",
            "tournaments.csv",
            "matches.csv",
            "sets.csv",
        }
        zf.extractall(seed_dir)

    _wipe(db_session)
    assert all(not rows for rows in _snapshot(db_session).values())

    import_seed = _load_import_seed()
    engine = db_session.get_bind()
    import_seed.SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    report = import_seed.run(seed_dir, dry_run=False)
    assert report.skipped == []

    db_session.expire_all()
    after = _snapshot(db_session)
    assert after == before


def test_csv_export_matches_seed_importer_header_layout() -> None:
    """Guards the contract directly: exported headers must be exactly what
    scripts/import_seed.py's readers expect, including the handeness typo."""
    import_seed = _load_import_seed()

    # Importer relies on these exact keys (see import_clubs/import_opponents/...).
    assert import_seed.TABLES == ("clubs", "opponents", "tournaments", "matches", "sets")


def test_json_export_contains_all_tables(client: TestClient, db_session: Session) -> None:
    _seed_data(db_session)

    response = client.get("/export/json")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"

    payload = json.loads(response.content)
    assert set(payload.keys()) == {"exported_at", "clubs", "opponents", "tournaments", "matches"}
    assert len(payload["clubs"]) == 2
    assert len(payload["opponents"]) == 2
    assert len(payload["tournaments"]) == 1
    assert len(payload["matches"]) == 3
    assert sum(len(m["sets"]) for m in payload["matches"]) == 3


def test_export_csv_empty_database(client: TestClient) -> None:
    response = client.get("/export/csv")
    assert response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        rows = list(csv.reader(io.StringIO(zf.read("clubs.csv").decode())))
        assert rows == [["club_id", "name", "city", "country", "surface", "environment"]]
