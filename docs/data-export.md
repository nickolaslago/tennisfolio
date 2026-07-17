# Data export & import

Tennisfolio never locks your data in. The **Backup & Export** section of the
Settings page (`/settings` in the web app) offers two one-click downloads,
both served by
[`apps/api/src/app/routers/export.py`](../apps/api/src/app/routers/export.py):

| Endpoint | Format | Contents |
| --- | --- | --- |
| `GET /export/csv` | `tennisfolio-export-<timestamp>.zip` | Five CSVs, one per table |
| `GET /export/json` | `tennisfolio-export-<timestamp>.json` | One JSON file, all tables |

Both are full snapshots — every row in every table, no pagination or
filtering.

## CSV export

The zip contains `clubs.csv`, `courts.csv`, `opponents.csv`, `tournaments.csv`,
`matches.csv`, and `sets.csv`. Their column layout is **identical to what
[`apps/api/scripts/import_seed.py`](../apps/api/scripts/import_seed.py)
reads** — the same script used to load the mock seed data — so a CSV export
can be re-imported with:

```bash
uv run python scripts/import_seed.py --seed-dir /path/to/unzipped-export
```

This is enforced by an automated test
([`apps/api/tests/test_export.py`](../apps/api/tests/test_export.py)) that
seeds a database, exports it, wipes it, re-imports the export, and asserts
the data is unchanged.

### Local IDs

Each row carries a `*_id` column that only exists to link rows *within the
export* — `mat-3` in `matches.csv` refers to the same match as `mat-3` in
`sets.csv`. These are **not** the database's real integer primary keys; the
importer maps them to whatever IDs the target database assigns on
insert/upsert. Prefixes: `clu-` (clubs), `cou-` (courts), `opp-` (opponents),
`tou-` (tournaments), `mat-` (matches), `set-` (sets).

### Column reference

**`clubs.csv`**: `club_id, name, city, country`

**`courts.csv`**: `court_id, club_id, surface, environment`

> A club owns one or more courts, each a unique `(surface, environment)`
> combination. A match's surface is derived through its court, so it is no
> longer stored on the club or the match directly.

**`opponents.csv`**: `opponent_id, last_name, name, nationality, handeness, age_range, level, notes`

> The `handeness` header is not a typo in this doc — it matches a typo in
> the original seed CSVs that the importer still reads. See
> `import_seed.py`'s `import_opponents`.

**`tournaments.csv`**: `tournament_id, name, season, tournament_type, format, club_id, start_date, end_date, notes`

**`matches.csv`**: `match_id, match_date, opponent_id, club_id, court_id, tournament_id, stage, duration_min, status, notes`

**`sets.csv`**: `set_id, match_id, set_no, games_won, games_lost, tiebreak`

### Conventions shared with the seed importer

- **Dates** (`match_date`, `start_date`, `end_date`) are `DD-MM-YYYY`, not ISO.
- **Booleans** (`tiebreak`) are the literal strings `true` / `false`.
- **Empty/null fields** are empty CSV cells, not the string `"null"` or `"None"`.
- **Enum columns** (`surface`, `environment`, `handeness`, `age_range`,
  `tournament_type`, `status`) hold the human-readable enum values from
  [`apps/api/src/app/models/enums.py`](../apps/api/src/app/models/enums.py) —
  e.g. `Clay`, `Outdoor`, `R`, `Knockout Tournament`, `played`.

Results, scores, and match type are **not exported** — per the project's
derived-data convention (see [`docs/schema.md`](./schema.md)), they're
computed from set scores and are recomputed automatically on re-import.

## JSON export

A single object:

```jsonc
{
  "exported_at": "2026-07-16T10:32:04.123456",
  "clubs": [ { "id": 1, "name": "...", "city": null, "country": null } ],
  "courts": [ { "id": 1, "club_id": 1, "surface": "Clay", "environment": "Outdoor" } ],
  "opponents": [ { "id": 1, "last_name": "...", "name": null, "nationality": null, "handedness": "R", "age_range": null, "level": null, "notes": null } ],
  "tournaments": [ { "id": 1, "name": "...", "season": null, "tournament_type": "Knockout Tournament", "format": null, "club_id": 1, "start_date": "2026-05-24", "end_date": null, "notes": null } ],
  "matches": [
    {
      "id": 1,
      "match_date": "2026-05-25",
      "opponent_id": 1,
      "club_id": 1,
      "court_id": 1,
      "tournament_id": 1,
      "stage": "R32",
      "duration_min": 125,
      "status": "played",
      "notes": null,
      "sets": [ { "id": 1, "set_no": 1, "games_won": 6, "games_lost": 4, "tiebreak": false } ]
    }
  ]
}
```

Unlike the CSV export, the JSON export uses the database's **real** integer
IDs directly (`opponent_id`, `club_id`, `tournament_id` point at other
objects' `id` fields in the same document), and nests each match's sets
inline rather than as a separate table. Those `id` fields are only used to
link rows within the document, the same way the CSV export's `clu-`/`opp-`/…
prefixes do — re-importing assigns fresh database IDs.

## Data import

The **Import** section on the Settings page (`/settings`), and
`POST /import` in
[`apps/api/src/app/routers/data_import.py`](../apps/api/src/app/routers/data_import.py),
accept either file produced by the export endpoints above — the CSV zip or
the JSON file — and use it to **replace** every table: everything currently
in the database is wiped first, then the file's contents are loaded in.
This is destructive and cannot be undone, which is why the Settings page
asks for confirmation before calling it.

The endpoint sniffs the upload's content to tell the two formats apart, so
either can be dropped on the same file picker. The CSV branch reuses the
exact parsing and per-entity import functions
[`apps/api/src/app/seed_import.py`](../apps/api/src/app/seed_import.py)
also exposes to `scripts/import_seed.py`, so the round-trip contract
described above is enforced by one shared implementation. Rows that don't
match the expected format (unknown enum values, dangling foreign keys, an
illegal set score, ...) are skipped and reported back rather than failing
the whole import — see
[`apps/api/tests/test_import.py`](../apps/api/tests/test_import.py) for the
export → import round-trip test and the skip-reporting behavior.
