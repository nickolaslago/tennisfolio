"""Data import: the destructive counterpart to app/routers/export.py.

Accepts a single uploaded file — either the zipped CSV bundle or the JSON
file produced by ``GET /export/csv`` / ``GET /export/json`` — validates it,
then wipes every table and reloads it from the upload. This is always a full
replace, never a merge; the frontend is responsible for confirming that with
the user before calling this endpoint.

The CSV branch reuses app.seed_import's parsing/import functions — the same
ones scripts/import_seed.py uses for seeding — so the round-trip contract
documented in docs/data-export.md is enforced by one shared implementation
rather than two.
"""

from __future__ import annotations

import io
import json
import zipfile
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import DbSession
from app.models import Club, Court, Match, Opponent, Set, Tournament
from app.models.enums import AgeRange, Environment, Handedness, MatchStatus, Surface, TournamentType
from app.schemas.data_import import ImportResult
from app.seed_import import (
    ImportReport,
    import_clubs,
    import_courts,
    import_matches,
    import_opponents,
    import_sets,
    import_tournaments,
    parse_csv_rows,
    validate_set,
    wipe_all,
)

router = APIRouter(prefix="/import", tags=["import"])

CSV_FILENAMES = (
    "clubs.csv",
    "courts.csv",
    "opponents.csv",
    "tournaments.csv",
    "matches.csv",
    "sets.csv",
)
REQUIRED_JSON_KEYS = ("clubs", "courts", "opponents", "tournaments", "matches")


def _result(report: ImportReport) -> ImportResult:
    return ImportResult(
        clubs=report.inserted.get("clubs", 0),
        courts=report.inserted.get("courts", 0),
        opponents=report.inserted.get("opponents", 0),
        tournaments=report.inserted.get("tournaments", 0),
        matches=report.inserted.get("matches", 0),
        sets=report.inserted.get("sets", 0),
        skipped=report.skipped,
    )


# ---------------------------------------------------------------------------
# CSV zip branch — delegates entirely to app.seed_import
# ---------------------------------------------------------------------------


def _import_csv_zip(db: Session, content: bytes) -> ImportResult:
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a valid zip file") from exc

    missing = [name for name in CSV_FILENAMES if name not in zf.namelist()]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Zip is missing required file(s): {', '.join(missing)}",
        )

    rows = {name: parse_csv_rows(zf.read(name).decode("utf-8")) for name in CSV_FILENAMES}

    report = ImportReport()
    try:
        wipe_all(db)
        club_ids = import_clubs(db, rows["clubs.csv"], report)
        court_ids = import_courts(db, rows["courts.csv"], club_ids, report)
        opponent_ids = import_opponents(db, rows["opponents.csv"], report)
        tournament_ids = import_tournaments(db, rows["tournaments.csv"], club_ids, report)
        match_ids = import_matches(
            db, rows["matches.csv"], opponent_ids, club_ids, court_ids, tournament_ids, report
        )
        import_sets(db, rows["sets.csv"], match_ids, report)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _result(report)


# ---------------------------------------------------------------------------
# JSON branch — same shape as GET /export/json, real ids used as local ids
# ---------------------------------------------------------------------------


def _json_club(db: Session, row: dict[str, Any], report: ImportReport) -> tuple[Any, int] | None:
    row_id = row.get("id")
    club = Club(
        name=row["name"],
        city=row.get("city"),
        country=row.get("country"),
    )
    db.add(club)
    db.flush()
    report.record("clubs", "inserted")
    return row_id, club.id


def _json_court(
    db: Session, row: dict[str, Any], club_ids: dict[Any, int], report: ImportReport
) -> tuple[Any, int] | None:
    row_id = row.get("id")

    club_row_id = row.get("club_id")
    if club_row_id not in club_ids:
        report.skip("courts", str(row_id), f"unknown club_id {club_row_id!r}")
        return None

    try:
        surface = Surface(row["surface"])
        environment = Environment(row["environment"])
    except (KeyError, ValueError) as exc:
        report.skip("courts", str(row_id), str(exc))
        return None

    court = Court(club_id=club_ids[club_row_id], surface=surface, environment=environment)
    db.add(court)
    db.flush()
    report.record("courts", "inserted")
    return row_id, court.id


def _json_opponent(
    db: Session, row: dict[str, Any], report: ImportReport
) -> tuple[Any, int] | None:
    row_id = row.get("id")
    try:
        handedness = Handedness(row["handedness"]) if row.get("handedness") else None
    except ValueError as exc:
        report.skip("opponents", str(row_id), str(exc))
        return None
    try:
        age_range = AgeRange(row["age_range"]) if row.get("age_range") else None
    except ValueError as exc:
        report.skip("opponents", str(row_id), str(exc))
        return None
    opponent = Opponent(
        last_name=row["last_name"],
        name=row.get("name"),
        nationality=row.get("nationality"),
        handedness=handedness,
        age_range=age_range,
        level=row.get("level"),
        notes=row.get("notes"),
    )
    db.add(opponent)
    db.flush()
    report.record("opponents", "inserted")
    return row_id, opponent.id


def _json_tournament(
    db: Session, row: dict[str, Any], club_ids: dict[Any, int], report: ImportReport
) -> tuple[Any, int] | None:
    row_id = row.get("id")
    try:
        tournament_type = TournamentType(row["tournament_type"])
    except ValueError as exc:
        report.skip("tournaments", str(row_id), str(exc))
        return None

    club_row_id = row.get("club_id")
    club_id: int | None = None
    if club_row_id is not None:
        if club_row_id not in club_ids:
            report.skip("tournaments", str(row_id), f"unknown club_id {club_row_id!r}")
            return None
        club_id = club_ids[club_row_id]

    tournament = Tournament(
        name=row["name"],
        season=row.get("season"),
        tournament_type=tournament_type,
        format=row.get("format"),
        club_id=club_id,
        start_date=date.fromisoformat(row["start_date"]) if row.get("start_date") else None,
        end_date=date.fromisoformat(row["end_date"]) if row.get("end_date") else None,
        notes=row.get("notes"),
    )
    db.add(tournament)
    db.flush()
    report.record("tournaments", "inserted")
    return row_id, tournament.id


def _json_match(
    db: Session,
    row: dict[str, Any],
    opponent_ids: dict[Any, int],
    club_ids: dict[Any, int],
    court_ids: dict[Any, int],
    tournament_ids: dict[Any, int],
    report: ImportReport,
) -> None:
    row_id = row.get("id")

    opponent_row_id = row.get("opponent_id")
    if opponent_row_id not in opponent_ids:
        report.skip("matches", str(row_id), f"unknown opponent_id {opponent_row_id!r}")
        return
    opponent_id = opponent_ids[opponent_row_id]

    club_row_id = row.get("club_id")
    if club_row_id is not None and club_row_id not in club_ids:
        report.skip("matches", str(row_id), f"unknown club_id {club_row_id!r}")
        return
    club_id = club_ids[club_row_id] if club_row_id is not None else None

    court_row_id = row.get("court_id")
    if court_row_id is not None and court_row_id not in court_ids:
        report.skip("matches", str(row_id), f"unknown court_id {court_row_id!r}")
        return
    court_id = court_ids[court_row_id] if court_row_id is not None else None

    tournament_row_id = row.get("tournament_id")
    if tournament_row_id is not None and tournament_row_id not in tournament_ids:
        report.skip("matches", str(row_id), f"unknown tournament_id {tournament_row_id!r}")
        return
    tournament_id = tournament_ids[tournament_row_id] if tournament_row_id is not None else None

    try:
        match_date = date.fromisoformat(row["match_date"])
    except (KeyError, ValueError) as exc:
        report.skip("matches", str(row_id), f"unparseable match_date: {exc}")
        return

    try:
        match_status = MatchStatus(row.get("status") or "played")
    except ValueError as exc:
        report.skip("matches", str(row_id), str(exc))
        return

    sets_data = row.get("sets") or []
    scored_sets: list[dict[str, Any]] = []
    seen: dict[int, tuple[int, int, bool]] = {}
    for set_row in sets_data:
        set_no = set_row["set_no"]
        games_won = set_row["games_won"]
        games_lost = set_row["games_lost"]
        tiebreak = bool(set_row.get("tiebreak", False))

        if set_no in seen and seen[set_no] != (games_won, games_lost, tiebreak):
            report.skip(
                "sets",
                str(set_row.get("id")),
                f"duplicate set_no {set_no} for match {row_id} with a different score "
                f"than {seen[set_no]!r} — keeping the first one seen",
            )
            continue
        seen[set_no] = (games_won, games_lost, tiebreak)

        error = validate_set(games_won, games_lost, tiebreak)
        if error is not None:
            report.skip("sets", str(set_row.get("id")), error)
            continue
        scored_sets.append(
            {
                "set_no": set_no,
                "games_won": games_won,
                "games_lost": games_lost,
                "tiebreak": tiebreak,
            }
        )

    match = Match(
        match_date=match_date,
        opponent_id=opponent_id,
        club_id=club_id,
        court_id=court_id,
        tournament_id=tournament_id,
        stage=row.get("stage"),
        duration_min=row.get("duration_min"),
        notes=row.get("notes"),
        status=match_status,
        sets=[Set(**s) for s in scored_sets],
    )
    db.add(match)
    db.flush()
    report.record("matches", "inserted")
    for _ in scored_sets:
        report.record("sets", "inserted")


def _import_json_payload(db: Session, payload: dict[str, Any]) -> ImportResult:
    missing = [key for key in REQUIRED_JSON_KEYS if key not in payload]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"JSON is missing required key(s): {', '.join(missing)}",
        )
    for key in REQUIRED_JSON_KEYS:
        if not isinstance(payload[key], list):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{key!r} must be a list")

    report = ImportReport()
    try:
        wipe_all(db)

        club_ids: dict[Any, int] = {}
        for row in payload["clubs"]:
            mapped = _json_club(db, row, report)
            if mapped is not None:
                club_ids[mapped[0]] = mapped[1]

        court_ids: dict[Any, int] = {}
        for row in payload["courts"]:
            mapped = _json_court(db, row, club_ids, report)
            if mapped is not None:
                court_ids[mapped[0]] = mapped[1]

        opponent_ids: dict[Any, int] = {}
        for row in payload["opponents"]:
            mapped = _json_opponent(db, row, report)
            if mapped is not None:
                opponent_ids[mapped[0]] = mapped[1]

        tournament_ids: dict[Any, int] = {}
        for row in payload["tournaments"]:
            mapped = _json_tournament(db, row, club_ids, report)
            if mapped is not None:
                tournament_ids[mapped[0]] = mapped[1]

        for row in payload["matches"]:
            _json_match(db, row, opponent_ids, club_ids, court_ids, tournament_ids, report)

        db.commit()
    except Exception:
        db.rollback()
        raise
    return _result(report)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("", response_model=ImportResult)
def import_data(db: DbSession, file: UploadFile) -> ImportResult:
    content = file.file.read()
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")

    if zipfile.is_zipfile(io.BytesIO(content)):
        return _import_csv_zip(db, content)

    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Unrecognized file: expected the zipped CSV export or the JSON export",
        ) from exc
    if not isinstance(payload, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "JSON import must be an object")
    return _import_json_payload(db, payload)
