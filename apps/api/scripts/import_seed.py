"""One-off CLI importer: load Tennisfolio mock seed CSVs into Postgres.

Reads the five CSVs shaped to the DAT-77 schema (clubs, opponents,
tournaments, matches, sets), maps their CSV-local IDs (``opp-1``, ``clu-1``,
...) to DB-generated primary keys on insert, and validates set scores before
writing them.

Idempotent: every entity is upserted on a natural key, so re-running the
script against a DB that already has the seed loaded updates rows in place
instead of duplicating them.

Usage (from apps/api):

    uv run python scripts/import_seed.py
    uv run python scripts/import_seed.py --seed-dir seed --dry-run
"""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Club, Match, Opponent, Set, Tournament
from app.models.enums import (
    AgeRange,
    Environment,
    Handedness,
    MatchStatus,
    TournamentType,
)
from app.models.enums import Surface as SurfaceEnum

DEFAULT_SEED_DIR = Path(__file__).resolve().parent.parent / "seed"

TABLES = ("clubs", "opponents", "tournaments", "matches", "sets")

# "Fast" isn't a Surface enum member — it's a common colloquial synonym for
# hard courts, which is how it's used in the seed data (USTA National Tennis
# Center, La Defense Arena are both real hard-court venues).
SURFACE_ALIASES: dict[str, SurfaceEnum] = {
    "Hard": SurfaceEnum.HARD,
    "Clay": SurfaceEnum.CLAY,
    "Grass": SurfaceEnum.GRASS,
    "Carpet": SurfaceEnum.CARPET,
    "Fast": SurfaceEnum.HARD,
}


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


@dataclass
class ImportReport:
    inserted: dict[str, int] = field(default_factory=dict)
    updated: dict[str, int] = field(default_factory=dict)
    skipped: list[str] = field(default_factory=list)

    def record(self, table: str, action: str) -> None:
        bucket = self.inserted if action == "inserted" else self.updated
        bucket[table] = bucket.get(table, 0) + 1

    def skip(self, table: str, row_id: str, reason: str) -> None:
        self.skipped.append(f"[{table}] {row_id}: {reason}")

    def print_summary(self) -> None:
        print("\n=== Seed import report ===")
        for table in TABLES:
            ins = self.inserted.get(table, 0)
            upd = self.updated.get(table, 0)
            print(f"  {table:12s} inserted={ins:<4d} updated={upd:<4d}")
        if self.skipped:
            print(f"\n{len(self.skipped)} skipped/ambiguous row(s):")
            for line in self.skipped:
                print(f"  - {line}")
        else:
            print("\nNo skipped/ambiguous rows.")


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------


def parse_date(value: str) -> date:
    """Seed CSVs use DD-MM-YYYY, not ISO."""
    return datetime.strptime(value.strip(), "%d-%m-%Y").date()


def parse_bool(value: str) -> bool:
    return value.strip().lower() == "true"


def blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def validate_set(games_won: int, games_lost: int, tiebreak: bool) -> str | None:
    """Return an error message if the score isn't a legal tennis set, else None."""
    winner, loser = max(games_won, games_lost), min(games_won, games_lost)
    if winner == 6 and loser <= 4:
        expected_tiebreak = False
    elif winner == 7 and loser == 5:
        expected_tiebreak = False
    elif winner == 7 and loser == 6:
        expected_tiebreak = True
    else:
        return f"not a legal set score ({games_won}-{games_lost})"
    if tiebreak != expected_tiebreak:
        return (
            f"tiebreak flag inconsistent with score ({games_won}-{games_lost}, tiebreak={tiebreak})"
        )
    return None


# ---------------------------------------------------------------------------
# Per-entity import (each upserts on a natural key, so re-runs are safe)
# ---------------------------------------------------------------------------


def import_clubs(db: Session, rows: list[dict[str, str]], report: ImportReport) -> dict[str, int]:
    id_map: dict[str, int] = {}
    for row in rows:
        csv_id = row["club_id"]
        name = row["name"].strip()
        surface_raw = blank_to_none(row.get("surface"))
        environment_raw = blank_to_none(row.get("environment"))

        if surface_raw and surface_raw not in SURFACE_ALIASES:
            report.skip("clubs", csv_id, f"unknown surface {surface_raw!r}")
            continue
        try:
            environment = Environment(environment_raw) if environment_raw else None
        except ValueError:
            report.skip("clubs", csv_id, f"unknown environment {environment_raw!r}")
            continue

        club = db.query(Club).filter_by(name=name).one_or_none()
        action = "updated" if club is not None else "inserted"
        if club is None:
            club = Club(name=name)
            db.add(club)
        club.city = blank_to_none(row.get("city"))
        club.country = blank_to_none(row.get("country"))
        club.surface = SURFACE_ALIASES[surface_raw] if surface_raw else None
        club.environment = environment
        db.flush()
        id_map[csv_id] = club.id
        report.record("clubs", action)
    return id_map


def import_opponents(
    db: Session, rows: list[dict[str, str]], report: ImportReport
) -> dict[str, int]:
    id_map: dict[str, int] = {}
    for row in rows:
        csv_id = row["opponent_id"]
        last_name = row["last_name"].strip()
        name = blank_to_none(row.get("name"))

        # Header typo in the source CSV ("handeness"); fall back to the
        # correctly spelled column if it's ever fixed upstream.
        handedness_raw = blank_to_none(row.get("handeness") or row.get("handedness"))
        try:
            handedness = Handedness(handedness_raw) if handedness_raw else None
        except ValueError:
            report.skip("opponents", csv_id, f"unknown handedness {handedness_raw!r}")
            handedness = None

        age_range_raw = blank_to_none(row.get("age_range"))
        try:
            age_range = AgeRange(age_range_raw) if age_range_raw else None
        except ValueError:
            report.skip("opponents", csv_id, f"unknown age_range {age_range_raw!r}")
            age_range = None

        opponent = db.query(Opponent).filter_by(last_name=last_name, name=name).one_or_none()
        action = "updated" if opponent is not None else "inserted"
        if opponent is None:
            opponent = Opponent(last_name=last_name, name=name)
            db.add(opponent)
        opponent.nationality = blank_to_none(row.get("nationality"))
        opponent.handedness = handedness
        opponent.age_range = age_range
        opponent.level = blank_to_none(row.get("level"))
        opponent.notes = blank_to_none(row.get("notes"))
        db.flush()
        id_map[csv_id] = opponent.id
        report.record("opponents", action)
    return id_map


def import_tournaments(
    db: Session,
    rows: list[dict[str, str]],
    club_ids: dict[str, int],
    report: ImportReport,
) -> dict[str, int]:
    id_map: dict[str, int] = {}
    for row in rows:
        csv_id = row["tournament_id"]
        name = row["name"].strip()
        season = blank_to_none(row.get("season"))

        try:
            tournament_type = TournamentType(row["tournament_type"].strip())
        except ValueError:
            report.skip(
                "tournaments", csv_id, f"unknown tournament_type {row['tournament_type']!r}"
            )
            continue

        club_csv_id = blank_to_none(row.get("club_id"))
        club_id: int | None = None
        if club_csv_id is not None:
            if club_csv_id not in club_ids:
                report.skip("tournaments", csv_id, f"unknown club_id {club_csv_id!r}")
                continue
            club_id = club_ids[club_csv_id]

        tournament = db.query(Tournament).filter_by(name=name, season=season).one_or_none()
        action = "updated" if tournament is not None else "inserted"
        if tournament is None:
            tournament = Tournament(name=name, season=season, tournament_type=tournament_type)
            db.add(tournament)
        tournament.tournament_type = tournament_type
        tournament.format = blank_to_none(row.get("format"))
        tournament.club_id = club_id
        start_date_raw = blank_to_none(row.get("start_date"))
        end_date_raw = blank_to_none(row.get("end_date"))
        tournament.start_date = parse_date(start_date_raw) if start_date_raw else None
        tournament.end_date = parse_date(end_date_raw) if end_date_raw else None
        tournament.notes = blank_to_none(row.get("notes"))
        db.flush()
        id_map[csv_id] = tournament.id
        report.record("tournaments", action)
    return id_map


def import_matches(
    db: Session,
    rows: list[dict[str, str]],
    opponent_ids: dict[str, int],
    club_ids: dict[str, int],
    tournament_ids: dict[str, int],
    report: ImportReport,
) -> dict[str, int]:
    id_map: dict[str, int] = {}
    for row in rows:
        csv_id = row["match_id"]

        opp_csv_id = row["opponent_id"].strip()
        if opp_csv_id not in opponent_ids:
            report.skip("matches", csv_id, f"unknown opponent_id {opp_csv_id!r}")
            continue
        opponent_id = opponent_ids[opp_csv_id]

        club_csv_id = blank_to_none(row.get("club_id"))
        if club_csv_id is not None and club_csv_id not in club_ids:
            report.skip("matches", csv_id, f"unknown club_id {club_csv_id!r}")
            continue
        club_id = club_ids[club_csv_id] if club_csv_id is not None else None

        tournament_csv_id = blank_to_none(row.get("tournament_id"))
        if tournament_csv_id is not None and tournament_csv_id not in tournament_ids:
            report.skip("matches", csv_id, f"unknown tournament_id {tournament_csv_id!r}")
            continue
        tournament_id = tournament_ids[tournament_csv_id] if tournament_csv_id is not None else None

        try:
            match_date = parse_date(row["match_date"])
        except ValueError:
            report.skip("matches", csv_id, f"unparseable match_date {row['match_date']!r}")
            continue

        surface_raw = blank_to_none(row.get("surface"))
        if surface_raw and surface_raw not in SURFACE_ALIASES:
            report.skip("matches", csv_id, f"unknown surface {surface_raw!r}")
            continue
        surface = SURFACE_ALIASES[surface_raw] if surface_raw else None

        try:
            status = MatchStatus(row.get("status", "played").strip() or "played")
        except ValueError:
            report.skip("matches", csv_id, f"unknown status {row.get('status')!r}")
            continue

        duration_raw = blank_to_none(row.get("duration_min"))
        duration_min = int(duration_raw) if duration_raw is not None else None

        match = (
            db.query(Match)
            .filter_by(
                match_date=match_date,
                opponent_id=opponent_id,
                club_id=club_id,
                tournament_id=tournament_id,
            )
            .one_or_none()
        )
        action = "updated" if match is not None else "inserted"
        if match is None:
            match = Match(match_date=match_date, opponent_id=opponent_id)
            db.add(match)
        match.club_id = club_id
        match.tournament_id = tournament_id
        match.stage = blank_to_none(row.get("stage"))
        match.surface = surface
        match.duration_min = duration_min
        match.notes = blank_to_none(row.get("notes"))
        match.status = status
        db.flush()
        id_map[csv_id] = match.id
        report.record("matches", action)
    return id_map


def import_sets(
    db: Session,
    rows: list[dict[str, str]],
    match_ids: dict[str, int],
    report: ImportReport,
) -> None:
    seen: dict[tuple[str, int], tuple[int, int, bool]] = {}
    for row in rows:
        csv_id = row["set_id"]

        match_csv_id = row["match_id"].strip()
        if match_csv_id not in match_ids:
            report.skip("sets", csv_id, f"unknown match_id {match_csv_id!r}")
            continue
        match_id = match_ids[match_csv_id]

        try:
            set_no = int(row["set_no"])
            games_won = int(row["games_won"])
            games_lost = int(row["games_lost"])
        except ValueError:
            report.skip("sets", csv_id, "non-numeric set_no/games_won/games_lost")
            continue
        tiebreak = parse_bool(row.get("tiebreak", "false"))

        dup_key = (match_csv_id, set_no)
        if dup_key in seen and seen[dup_key] != (games_won, games_lost, tiebreak):
            report.skip(
                "sets",
                csv_id,
                f"duplicate set_no {set_no} for {match_csv_id} with a different score "
                f"than {seen[dup_key]!r} — keeping the first one seen",
            )
            continue
        seen[dup_key] = (games_won, games_lost, tiebreak)

        error = validate_set(games_won, games_lost, tiebreak)
        if error is not None:
            report.skip("sets", csv_id, error)
            continue

        set_row = db.query(Set).filter_by(match_id=match_id, set_no=set_no).one_or_none()
        action = "updated" if set_row is not None else "inserted"
        if set_row is None:
            set_row = Set(match_id=match_id, set_no=set_no)
            db.add(set_row)
        set_row.games_won = games_won
        set_row.games_lost = games_lost
        set_row.tiebreak = tiebreak
        db.flush()
        report.record("sets", action)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def run(seed_dir: Path, dry_run: bool) -> ImportReport:
    report = ImportReport()
    db = SessionLocal()
    try:
        club_ids = import_clubs(db, read_csv(seed_dir / "clubs.csv"), report)
        opponent_ids = import_opponents(db, read_csv(seed_dir / "opponents.csv"), report)
        tournament_ids = import_tournaments(
            db, read_csv(seed_dir / "tournaments.csv"), club_ids, report
        )
        match_ids = import_matches(
            db,
            read_csv(seed_dir / "matches.csv"),
            opponent_ids,
            club_ids,
            tournament_ids,
            report,
        )
        import_sets(db, read_csv(seed_dir / "sets.csv"), match_ids, report)

        if dry_run:
            db.rollback()
        else:
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--seed-dir",
        type=Path,
        default=DEFAULT_SEED_DIR,
        help=f"directory containing the 5 seed CSVs (default: {DEFAULT_SEED_DIR})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="run the import but roll back instead of committing",
    )
    args = parser.parse_args(argv)

    for name in ("clubs.csv", "opponents.csv", "tournaments.csv", "matches.csv", "sets.csv"):
        if not (args.seed_dir / name).exists():
            print(f"error: missing {name} in {args.seed_dir}", file=sys.stderr)
            return 1

    report = run(args.seed_dir, args.dry_run)
    report.print_summary()
    if args.dry_run:
        print("\n(dry run — nothing was committed)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
