# 🎾 Tennisfolio

*A beautiful, private, local-first tennis performance tracker. Your matches, your data, on your device.*

## What we're building

Tennisfolio is an open-source app for recording and analysing your own tennis matches — the sporting equivalent of [Wealthfolio](https://github.com/wealthfolio/wealthfolio), which does the same for an investment portfolio. You log opponents, clubs, tournaments, matches and sets; the app derives results, streaks and win-rates and shows them back to you. No account, no cloud, no third-party analytics, no subscription. The database is a single local file you own and can back up to your NAS.

The prototype already exists as a Notion workspace ("Tennis Journey") with four linked tables — Opponents, Clubs, Matches, Sets. That validated the data model, but Notion's data entry is too slow (every match means manually creating and relinking rows, and buttons can't take input in one shot). Tennisfolio exists to fix exactly that: **capture a whole match, including its sets, from a single screen.**

## Principles

The guiding ethos, borrowed from Wealthfolio's "boring, beautiful, and it just works":

- **Local-first.** All data in a local SQLite file. Works fully offline. The user is responsible for backups, and the app makes export/backup trivial.
- **No account, no lock-in.** Nothing to sign up for. Plain, documented schema and one-click export to CSV/JSON so the data is never trapped.
- **Fast to log, rich to read.** Entering a match should take seconds. Reading your stats should feel like a proper dashboard.
- **Open source.** Public repo, permissive-ish license (decision pending — see open questions).

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

Because everything result-related derives from Sets, the model handles 1, 3 or 5 sets identically with no schema change.

## Core feature: one-screen match entry

The feature that justifies the whole app. A single form:

- Opponent (dropdown, with quick "＋ new opponent")
- Club (dropdown) → then a court picker limited to that club's courts (auto-selected when there's only one)
- Tournament + stage (optional)
- **Score** — one field: `6-4` or `6-4 3-6 10-7`

On submit, the app parses the score string into sets, writes the Match and its linked Sets in one transaction, and computes the result. No relinking, no per-set rows to create by hand.

## Stack

- **apps/web** — React 18 + TypeScript + Vite, Tailwind, shadcn/ui
- **apps/api** — FastAPI (Python 3.12), SQLAlchemy 2, Alembic, Pydantic v2
- **packages/core** — shared logic (score parser, types), reused by a future mobile app

## Roadmap

**Phase 0 — Foundations.** Repo scaffold, SQLite schema + migrations, seed importer that ingests the exported Notion CSVs so the existing history isn't lost.

**Phase 1 — The folio core.** CRUD for all five tables and the one-screen match-entry form with score parsing. This is the MVP; if only this ships, the app is already better than the Notion setup.

**Phase 2 — Stats dashboard.** Win-rate overall and by surface / opponent / club / league; current and longest streaks; tiebreak record; deciding-set record. Charts and filters.

**Phase 3 — Tournaments.** Standings/table view derived from tournament matches, season filters, head-to-head pages per opponent.

**Phase 4 — Later / optional.** Mobile companion; hooks into Apple Health (match duration/calories) and Home Assistant; and a small **MCP server** so Claude can answer "what's my clay win-rate this season?" straight from the local DB.

## Open questions / decisions

- **Name & license**: "Tennisfolio" as the name; AGPL-3.0 (like Wealthfolio) vs. MIT.
- **Scope of v1**: singles only, or doubles too (would need a second opponent/partner on Match)?
- **Seeding**: confirm we start by importing the current Notion export so nothing is retyped.

## Getting started

See [CLAUDE.md](./CLAUDE.md) for the full command reference and build conventions.

```sh
# API — http://localhost:8000/docs
cd apps/api && uv run uvicorn app.main:app --reload

# Web — http://localhost:5173
cd apps/web && pnpm install && pnpm dev
```

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
