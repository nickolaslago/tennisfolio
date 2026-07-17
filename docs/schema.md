# Tennisfolio data model

The API persists six core entities in PostgreSQL. Results and score strings are
**derived, never stored** — see [Derived data](#derived-data-never-stored).

Models live in [`apps/api/src/app/models/`](../apps/api/src/app/models); the schema
is created by the Alembic migration chain in
[`apps/api/alembic/versions/`](../apps/api/alembic/versions).

## ERD

```mermaid
erDiagram
    OPPONENTS ||--o{ MATCHES : "played against"
    CLUBS ||--o{ COURTS : "owns"
    CLUBS ||--o{ MATCHES : "hosted at"
    CLUBS ||--o{ TOURNAMENTS : "hosts"
    COURTS ||--o{ MATCHES : "played on"
    TOURNAMENTS ||--o{ MATCHES : "part of"
    MATCHES ||--o{ SETS : "broken into"

    OPPONENTS {
        int id PK
        string last_name "indexed, required"
        string name
        string nationality
        enum handedness "R | L"
        enum age_range "Under 18 … 60+"
        string level
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    CLUBS {
        int id PK
        string name "indexed, required"
        string city
        string country
        timestamptz created_at
        timestamptz updated_at
    }

    COURTS {
        int id PK
        int club_id FK "required"
        enum surface "Hard | Clay | Grass | Carpet, required"
        enum environment "Indoor | Outdoor, required"
        timestamptz created_at
        timestamptz updated_at
    }

    TOURNAMENTS {
        int id PK
        string name "indexed, required"
        string season
        enum tournament_type "Knockout Tournament | Ranking League, required"
        string format
        int club_id FK "nullable, optional host"
        date start_date
        date end_date
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    MATCHES {
        int id PK
        date match_date "indexed, required"
        int opponent_id FK "required"
        int club_id FK "nullable"
        int court_id FK "nullable, must belong to club"
        int tournament_id FK "nullable → friendly"
        string stage
        int duration_min
        text notes
        enum status "played | scheduled, default played"
        timestamptz created_at
        timestamptz updated_at
    }

    SETS {
        int id PK
        int match_id FK "required"
        int set_no "unique per match"
        int games_won
        int games_lost
        bool tiebreak "default false"
    }
```

## Enums

Native PostgreSQL enum types. Human-readable strings are stored (via
`values_callable`), so the values below are exactly what lands in the database.

| Type | Values |
| --- | --- |
| `handedness` | `R`, `L` |
| `age_range` | `Under 18`, `18-29`, `30-39`, `40-49`, `50-59`, `60+` |
| `surface` | `Hard`, `Clay`, `Grass`, `Carpet` |
| `environment` | `Indoor`, `Outdoor` |
| `tournament_type` | `Knockout Tournament`, `Ranking League` |
| `match_status` | `played`, `scheduled` |

## Foreign keys & delete behaviour

| Child → Parent | Column | On delete | Rationale |
| --- | --- | --- | --- |
| `courts` → `clubs` | `club_id` (required) | `CASCADE` | A court has no meaning without its club; delete a club's courts with it. |
| `tournaments` → `clubs` | `club_id` (nullable) | `SET NULL` | The host club is optional; removing a club shouldn't delete its tournaments. |
| `matches` → `opponents` | `opponent_id` (required) | `RESTRICT` | A match is meaningless without its opponent; block deletes that would orphan matches. |
| `matches` → `clubs` | `club_id` (nullable) | `SET NULL` | Venue is optional context. |
| `matches` → `courts` | `court_id` (nullable) | `SET NULL` | The specific court is optional context; a match validates that its court belongs to its club. |
| `matches` → `tournaments` | `tournament_id` (nullable) | `SET NULL` | A null tournament means a friendly; removing a tournament demotes its matches to friendlies rather than deleting them. |
| `sets` → `matches` | `match_id` (required) | `CASCADE` | Sets have no meaning without their match; delete them with it. |

## Indexes & constraints

- **Indexes**: `opponents.last_name`, `clubs.name`, `tournaments.name`,
  `matches.match_date`, and every foreign-key column
  (`courts.club_id`, `tournaments.club_id`, `matches.opponent_id`,
  `matches.club_id`, `matches.court_id`, `matches.tournament_id`,
  `sets.match_id`).
- **Unique**: `(match_id, set_no)` on `sets` — a match can't have two "set 2"s;
  `(club_id, surface, environment)` on `courts` — a club can't have two
  identical courts.
- **Audit columns**: every table except `sets` carries `created_at` / `updated_at`
  (`timestamptz`, server-defaulted to `now()`; `updated_at` bumped on update).

## Derived data (never stored)

Per the project convention, computed values are never persisted — they are
derived in the API layer (mirroring [`packages/core`](../packages/core)'s score
parser):

| Derived value | How it's computed |
| --- | --- |
| **Set result** | `games_won > games_lost`. |
| **Match result** | Majority of set wins across the match's sets. |
| **Score string** | Joined `games_won-games_lost` per set, e.g. `6-4 3-6 10-7`. |
| **Match type** | `Friendly` when `tournament_id` is null, otherwise `Competitive` — exposed as a hybrid property on `Match`. |

## Applying the schema

The default database URL is SQLite (local-first). To target PostgreSQL, set
`TENNISFOLIO_DATABASE_URL`, then run the migration chain:

```bash
export TENNISFOLIO_DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/tennisfolio"
uv run alembic upgrade head
```

The chain builds from an empty database and downgrades cleanly back to empty
(enum types included).
