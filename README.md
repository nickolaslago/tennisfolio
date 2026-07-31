# 🎾 Tennisfolio

*An open-source, local-first tennis performance tracker. Your matches, your data, on your device.*

[![Release](https://img.shields.io/github/v/release/nickolaslago/tennisfolio?include_prereleases&sort=semver)](https://github.com/nickolaslago/tennisfolio/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](./LICENSE)

**[Landing page](https://nickolaslago.github.io/tennisfolio/)** · **[Install](#one-command-install-prebuilt-images)** · **[Changelog](./CHANGELOG.md)**

> **Status: Alpha (`v0.1.0-alpha`).** The folio core, stats dashboard and
> self-hosted install are all usable day-to-day. It's local-first and
> single-device by design — no account, no cloud, no sync. See the
> [changelog](./CHANGELOG.md) for what's included and the known limitations.

## What we're building

Tennisfolio is an open-source app for recording and analysing your own tennis matches. You log opponents, clubs, tournaments, matches and sets; the app derives results, streaks and win-rates and shows them back to you. No account, no cloud, no third-party analytics, no subscription — the database is a single local file you own, or a Postgres instance running in your own Docker container.

The prototype already exists as a Notion workspace ("Tennis Journey") with four linked tables — Opponents, Clubs, Matches, Sets. That validated the data model, but Notion's data entry is too slow (every match means manually creating and relinking rows, and buttons can't take input in one shot). Tennisfolio exists to fix exactly that: **capture a whole match, including its sets, from a single screen.**

## Principles

The guiding ethos: boring, beautiful, and it just works.

- **Local-first.** All data in a local SQLite file by default, or your own Postgres container. Works fully offline. The user is responsible for backups, and the app makes export/backup trivial.
- **No account, no lock-in.** Nothing to sign up for. Plain, documented schema and one-click export to CSV/JSON so the data is never trapped.
- **Fast to log, rich to read.** Entering a match should take seconds. Reading your stats should feel like a proper dashboard.
- **Open source.** Public repo, AGPL-3.0 licensed — see [License](#license).

## Data model

Carried over from the Notion prototype, with results **derived** rather than stored (a set is won when games won > games lost; a match result and its score string aggregate up from its sets). The one addition is **Tournaments**, linked to Matches, with a type select: Knockout Tournament or Ranking League.

| Table | Purpose |
|---|---|
| Opponents | Who you played |
| Clubs | Where you played |
| Courts | A club's courts, each a unique (surface, environment) pair |
| Tournaments | Knockout or ranking-league context for matches |
| Matches | One row per match; played on one of its club's courts; result and score are derived |
| Sets | Per-set games won/lost; a match's result aggregates from these |

Because everything result-related derives from Sets, the model handles 1, 3 or 5 sets identically with no schema change. See [docs/schema.md](./docs/schema.md) for the full ERD, and [docs/data-export.md](./docs/data-export.md) for the export/import format.

## Core feature: one-screen match entry

The feature that justifies the whole app. A single form:

- Opponent (dropdown, with quick "＋ new opponent")
- Club (dropdown) → then a court picker limited to that club's courts (auto-selected when there's only one)
- Tournament + stage (optional)
- **Score** — one field: `6-4` or `6-4 3-6 10-7`

On submit, the app parses the score string into sets, writes the Match and its linked Sets in one transaction, and computes the result. No relinking, no per-set rows to create by hand.

## Structure

```
tennisfolio/
├── apps/
│   ├── web/    # React 18 + TypeScript (Vite), Tailwind v4, shadcn/ui
│   └── api/    # FastAPI (Python 3.12), SQLAlchemy 2, Alembic, Pydantic v2
├── packages/
│   └── core/   # shared TS logic (score parser, types) — no runtime deps, consumed via workspace protocol
└── e2e/        # Playwright end-to-end suite
```

`apps/web` and `packages/core` are a pnpm workspace (see `pnpm-workspace.yaml`). `apps/api` is a standalone `uv`-managed Python project — it is not part of the pnpm workspace and has its own lockfile (`uv.lock`).

## Getting started

See [CLAUDE.md](./CLAUDE.md) for the full command reference and build conventions.

```sh
# API — http://localhost:8000/docs (SQLite by default, a single local file)
cd apps/api && uv run uvicorn app.main:app --reload

# Web — http://localhost:5173
cd apps/web && pnpm install && pnpm dev
```

### Or with Docker

For local development, `docker compose up` builds and runs the whole stack — Postgres, the API
and the web app — each in its own container, from source:

```sh
docker compose up
```

- Web: http://localhost:3000
- API: http://localhost:8000/docs

#### One-command install (prebuilt images)

For a quick install that doesn't build from source, `docker-compose.prod.yml` pulls prebuilt,
multi-arch (amd64 + arm64) images published to GHCR on every tagged release:

```sh
curl -O https://raw.githubusercontent.com/nickolaslago/tennisfolio/main/docker-compose.prod.yml
# pin to a release for reproducible installs (omit to track `latest`)
TENNISFOLIO_VERSION=v0.1.0-alpha docker compose -f docker-compose.prod.yml up -d
```

- Web: http://localhost:3000
- API: http://localhost:8000/docs

Both compose files read the same environment variables (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `tennisfolio` | Postgres role used by the `db` service |
| `POSTGRES_PASSWORD` | `tennisfolio` | Postgres password — change this for anything beyond local use |
| `POSTGRES_DB` | `tennisfolio` | Database name |
| `POSTGRES_PORT` | `5432` | Host port mapped to Postgres |
| `TENNISFOLIO_DATABASE_URL` | derived from the vars above | Full DB URL the API connects with; override to point at an external Postgres instance |
| `API_PORT` | `8000` | Host port mapped to the API |
| `WEB_PORT` | `3000` | Host port mapped to the web app |
| `TENNISFOLIO_VERSION` | `latest` | Image tag to pull in `docker-compose.prod.yml` — pin to a semver tag (e.g. `v0.3.0`) for reproducible upgrades |

Match data lives in the `pgdata` named volume (mounted at `/var/lib/postgresql/data` in the `db`
container) — back it up with `docker run --rm -v tennisfolio_pgdata:/data -v $PWD:/backup alpine tar czf /backup/pgdata.tar.gz /data`,
or point `TENNISFOLIO_DATABASE_URL` at your own externally-managed Postgres instance instead.

## Roadmap

**Phase 0 — Foundations.** Repo scaffold, SQLite schema + migrations, seed importer that ingests the exported Notion CSVs so the existing history isn't lost.

**Phase 1 — The folio core.** CRUD for all six tables and the one-screen match-entry form with score parsing. This is the MVP; if only this ships, the app is already better than the Notion setup.

**Phase 2 — Stats dashboard.** Win-rate overall and by surface / opponent / club / league; current and longest streaks; tiebreak record; deciding-set record. Charts and filters.

**Phase 3 — Tournaments.** Standings/table view derived from tournament matches, season filters, head-to-head pages per opponent.

**Phase 4 — Later / optional.** Mobile companion; hooks into Apple Health (match duration/calories) and Home Assistant; and a small **MCP server** so Claude can answer "what's my clay win-rate this season?" straight from the local DB.

## Open questions / decisions

- **Scope of v1**: singles only, or doubles too (would need a second opponent/partner on Match)?
- **Seeding**: confirm we start by importing the current Notion export so nothing is retyped.

## CI

Every PR runs `.github/workflows/ci.yml`: `ruff` + `pytest` for `apps/api`, `eslint` + a
`tsc`/Vite build for `apps/web`, and `vitest` for `packages/core` as parallel jobs (each with
pnpm store / `uv` cache), followed by an `e2e` job that builds and boots the full `docker
compose up` stack and runs the Playwright smoke suite in `e2e/` against it (opponent → club →
match-by-score → derived result → table/card view toggle).

To make the green pipeline required before merging, turn on branch protection for `main` in
**Settings → Branches → Add branch protection rule**: require the `api`, `web`, `core`, and
`e2e` status checks to pass (and "Require branches to be up to date before merging") before a
PR can be merged.

## License

AGPL-3.0 — see [LICENSE](./LICENSE).

## Support

Tennisfolio is free and open source, built and maintained on personal time. If it's useful to you, you can support its development at [Buy Me a Coffee](https://buymeacoffee.com/nickolaslago).
