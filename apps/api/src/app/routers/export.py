"""Data export: every table as zipped CSVs or as a single JSON file.

The CSV column layout mirrors exactly what ``scripts/import_seed.py`` reads,
including its quirks (DD-MM-YYYY dates, the ``handeness`` header typo, the
``clu-``/``opp-``/``tou-``/``mat-``/``set-`` prefixed local IDs used to link
rows across files). That symmetry is what makes export -> wipe -> re-import
round-trip cleanly; see ``docs/data-export.md``.
"""

import csv
import io
import json
import zipfile
from collections.abc import Iterable
from datetime import date, datetime

from fastapi import APIRouter
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import DbSession
from app.models import Club, Match, Opponent, Tournament

router = APIRouter(prefix="/export", tags=["export"])

EXPORT_TIMESTAMP_FORMAT = "%Y%m%d-%H%M%S"


def _fmt_date(value: date | None) -> str:
    """Seed CSVs use DD-MM-YYYY, not ISO — match scripts/import_seed.py's parse_date."""
    return value.strftime("%d-%m-%Y") if value is not None else ""


def _fmt_bool(value: bool) -> str:
    return "true" if value else "false"


def _fmt(value: object) -> str:
    return "" if value is None else str(value)


def _write_csv(header: list[str], rows: Iterable[list[str]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue()


def _clubs_csv(clubs: list[Club]) -> str:
    rows = [
        [
            f"clu-{c.id}",
            c.name,
            _fmt(c.city),
            _fmt(c.country),
            _fmt(c.surface.value if c.surface else None),
            _fmt(c.environment.value if c.environment else None),
        ]
        for c in clubs
    ]
    return _write_csv(["club_id", "name", "city", "country", "surface", "environment"], rows)


def _opponents_csv(opponents: list[Opponent]) -> str:
    rows = [
        [
            f"opp-{o.id}",
            o.last_name,
            _fmt(o.name),
            _fmt(o.nationality),
            _fmt(o.handedness.value if o.handedness else None),
            _fmt(o.age_range.value if o.age_range else None),
            _fmt(o.level),
            _fmt(o.notes),
        ]
        for o in opponents
    ]
    return _write_csv(
        [
            "opponent_id",
            "last_name",
            "name",
            "nationality",
            "handeness",
            "age_range",
            "level",
            "notes",
        ],
        rows,
    )


def _tournaments_csv(tournaments: list[Tournament]) -> str:
    rows = [
        [
            f"tou-{t.id}",
            t.name,
            _fmt(t.season),
            t.tournament_type.value,
            _fmt(t.format),
            f"clu-{t.club_id}" if t.club_id is not None else "",
            _fmt_date(t.start_date),
            _fmt_date(t.end_date),
            _fmt(t.notes),
        ]
        for t in tournaments
    ]
    return _write_csv(
        [
            "tournament_id",
            "name",
            "season",
            "tournament_type",
            "format",
            "club_id",
            "start_date",
            "end_date",
            "notes",
        ],
        rows,
    )


def _matches_csv(matches: list[Match]) -> str:
    rows = [
        [
            f"mat-{m.id}",
            _fmt_date(m.match_date),
            f"opp-{m.opponent_id}",
            f"clu-{m.club_id}" if m.club_id is not None else "",
            f"tou-{m.tournament_id}" if m.tournament_id is not None else "",
            _fmt(m.stage),
            _fmt(m.surface.value if m.surface else None),
            _fmt(m.duration_min),
            m.status.value,
            _fmt(m.notes),
        ]
        for m in matches
    ]
    return _write_csv(
        [
            "match_id",
            "match_date",
            "opponent_id",
            "club_id",
            "tournament_id",
            "stage",
            "surface",
            "duration_min",
            "status",
            "notes",
        ],
        rows,
    )


def _sets_csv(matches: list[Match]) -> str:
    rows = [
        [
            f"set-{s.id}",
            f"mat-{s.match_id}",
            str(s.set_no),
            str(s.games_won),
            str(s.games_lost),
            _fmt_bool(s.tiebreak),
        ]
        for m in matches
        for s in m.sets
    ]
    return _write_csv(["set_id", "match_id", "set_no", "games_won", "games_lost", "tiebreak"], rows)


def _load_all(db: DbSession) -> tuple[list[Club], list[Opponent], list[Tournament], list[Match]]:
    clubs = list(db.scalars(select(Club).order_by(Club.id)).all())
    opponents = list(db.scalars(select(Opponent).order_by(Opponent.id)).all())
    tournaments = list(db.scalars(select(Tournament).order_by(Tournament.id)).all())
    matches = list(
        db.scalars(select(Match).options(selectinload(Match.sets)).order_by(Match.id)).all()
    )
    return clubs, opponents, tournaments, matches


def _timestamp() -> str:
    return datetime.now().strftime(EXPORT_TIMESTAMP_FORMAT)


@router.get("/csv")
def export_csv(db: DbSession) -> Response:
    clubs, opponents, tournaments, matches = _load_all(db)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("clubs.csv", _clubs_csv(clubs))
        zf.writestr("opponents.csv", _opponents_csv(opponents))
        zf.writestr("tournaments.csv", _tournaments_csv(tournaments))
        zf.writestr("matches.csv", _matches_csv(matches))
        zf.writestr("sets.csv", _sets_csv(matches))

    filename = f"tennisfolio-export-{_timestamp()}.zip"
    return Response(
        content=buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/json")
def export_json(db: DbSession) -> Response:
    clubs, opponents, tournaments, matches = _load_all(db)

    payload = {
        "exported_at": datetime.now().isoformat(),
        "clubs": [
            {
                "id": c.id,
                "name": c.name,
                "city": c.city,
                "country": c.country,
                "surface": c.surface.value if c.surface else None,
                "environment": c.environment.value if c.environment else None,
            }
            for c in clubs
        ],
        "opponents": [
            {
                "id": o.id,
                "last_name": o.last_name,
                "name": o.name,
                "nationality": o.nationality,
                "handedness": o.handedness.value if o.handedness else None,
                "age_range": o.age_range.value if o.age_range else None,
                "level": o.level,
                "notes": o.notes,
            }
            for o in opponents
        ],
        "tournaments": [
            {
                "id": t.id,
                "name": t.name,
                "season": t.season,
                "tournament_type": t.tournament_type.value,
                "format": t.format,
                "club_id": t.club_id,
                "start_date": t.start_date.isoformat() if t.start_date else None,
                "end_date": t.end_date.isoformat() if t.end_date else None,
                "notes": t.notes,
            }
            for t in tournaments
        ],
        "matches": [
            {
                "id": m.id,
                "match_date": m.match_date.isoformat(),
                "opponent_id": m.opponent_id,
                "club_id": m.club_id,
                "tournament_id": m.tournament_id,
                "stage": m.stage,
                "surface": m.surface.value if m.surface else None,
                "duration_min": m.duration_min,
                "status": m.status.value,
                "notes": m.notes,
                "sets": [
                    {
                        "id": s.id,
                        "set_no": s.set_no,
                        "games_won": s.games_won,
                        "games_lost": s.games_lost,
                        "tiebreak": s.tiebreak,
                    }
                    for s in m.sets
                ],
            }
            for m in matches
        ],
    }

    filename = f"tennisfolio-export-{_timestamp()}.json"
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
