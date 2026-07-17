"""One-off CLI importer: load Tennisfolio mock seed CSVs into Postgres.

Reads the five CSVs shaped to the DAT-77 schema (clubs, opponents,
tournaments, matches, sets), maps their CSV-local IDs (``opp-1``, ``clu-1``,
...) to DB-generated primary keys on insert, and validates set scores before
writing them.

Idempotent: every entity is upserted on a natural key, so re-running the
script against a DB that already has the seed loaded updates rows in place
instead of duplicating them.

The parsing and per-entity import logic lives in ``app.seed_import`` so it can
be shared with the destructive Import feature (``app.routers.data_import``),
which reuses these same functions after wiping the database.

Usage (from apps/api):

    uv run python scripts/import_seed.py
    uv run python scripts/import_seed.py --seed-dir seed --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from app.db import SessionLocal
from app.seed_import import (
    TABLES,
    ImportReport,
    import_clubs,
    import_matches,
    import_opponents,
    import_sets,
    import_tournaments,
    parse_csv_rows,
)

DEFAULT_SEED_DIR = Path(__file__).resolve().parent.parent / "seed"


def read_csv(path: Path) -> list[dict[str, str]]:
    return parse_csv_rows(path.read_text(encoding="utf-8"))


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

    for table in TABLES:
        name = f"{table}.csv"
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
