# 🎾 Tennisfolio — Cowork Project Brief

*A beautiful, private, local-first tennis performance tracker. Your matches, your data, on your device.*

## What we're building

Tennisfolio is an open-source desktop app for recording and analysing your own tennis matches — the sporting equivalent of [Wealthfolio](https://github.com/wealthfolio/wealthfolio), which does the same for an investment portfolio. You log opponents, clubs, leagues, matches and sets; the app derives results, streaks and win-rates and shows them back to you. No account, no cloud, no third-party analytics, no subscription. The database is a single local file you own and can back up to your NAS.

The prototype already exists as a Notion workspace ("Tennis Journey") with four linked tables — Opponents, Clubs, Matches, Sets. That validated the data model, but Notion's data entry is too slow (every match means manually creating and relinking rows, and buttons can't take input in one shot). Tennisfolio exists to fix exactly that: **capture a whole match, including its sets, from a single screen.**

## Principles

The guiding ethos, borrowed from Wealthfolio's "boring, beautiful, and it just works":

- **Local-first.** All data in a local SQLite file. Works fully offline. The user is responsible for backups, and the app makes export/backup trivial.
- **No account, no lock-in.** Nothing to sign up for. Plain, documented schema and one-click export to CSV/JSON so the data is never trapped.
- **Fast to log, rich to read.** Entering a match should take seconds. Reading your stats should feel like a proper dashboard.
- **Open source.** Public repo, permissive-ish license (Wealthfolio uses AGPL-3.0 — a decision for us to make, see below).

## Data model

Carried over from the Notion prototype, with results **derived** rather than stored (a set is won when games won > games lost; a match result and its score string aggregate up from its sets). The one addition is **Leagues**, linked to Matches.

### Opponents
| Field | Type | Notes |
|---|---|---|
| opponent_id | PK | e.g. `OPP-1` |
| last_name | text | |
| name | text | display name |
| nationality | text | |
| handedness | enum | Right / Left |
| age_range | enum | 26–35, 36–45, … |
| level | text | optional rating |
| notes | text | |

### Clubs
| Field | Type | Notes |
|---|---|---|
| club_id | PK | e.g. `CLU-1` |
| name | text | |
| city | text | |
| surface | enum | Clay / Piso Rápido / Hard / … |
| environment | enum | Indoor / Outdoor |

### Leagues *(new)*
| Field | Type | Notes |
|---|---|---|
| league_id | PK | e.g. `LEA-1` |
| name | text | e.g. "Tennis Hero – Summer 2026" |
| season | text | year or season label |
| format | enum | Round-robin / Group + knockout / Ladder |
| club_id | FK → Clubs | optional host/organiser |
| start_date | date | |
| end_date | date | |
| notes | text | |

### Matches
| Field | Type | Notes |
|---|---|---|
| match_id | PK | e.g. `MAT-1` |
| match_date | date | |
| opponent_id | FK → Opponents | |
| club_id | FK → Clubs | |
| league_id | FK → Leagues | nullable — friendlies have none |
| stage | text | e.g. "Group Stage", "Semi-final" (league matches) |
| surface | enum | actual surface played (a club can have several) |
| match_type | enum | Friendly / League (derivable from league_id) |
| **result** | derived | Win / Loss, from set wins |
| **score** | derived | "6-4 3-6 10-7", aggregated from sets |
| duration_min | int | optional |
| notes | text | |

### Sets
| Field | Type | Notes |
|---|---|---|
| set_id | PK | e.g. `SET-1` |
| match_id | FK → Matches | |
| set_no | int | 1, 2, 3 |
| games_won | int | |
| games_lost | int | |
| tiebreak | bool | |
| **set_result** | derived | Win / Loss, from games |

Because everything result-related derives from Sets, the model handles 1, 3 or 5 sets identically with no schema change.

## Core feature: one-screen match entry

The feature that justifies the whole app. A single form:

- Opponent (dropdown, with quick "＋ new opponent")
- Club (dropdown) → pre-fills surface, editable
- League + stage (optional)
- **Score** — one field: `6-4` or `6-4 3-6 10-7`

On submit, the app parses the score string into sets, writes the Match and its linked Sets in one transaction, and computes the result. No relinking, no per-set rows to create by hand. This is the "type once" flow that Notion couldn't give us.

## Proposed stack

Mirroring Wealthfolio so we inherit a proven local-first shape (this is a **decision to confirm** — see open questions):

- **Tauri** (Rust backend, tiny native desktop app, cross-platform macOS/Windows/Linux)
- **React + TypeScript** frontend, **Tailwind** + **shadcn/Radix** for UI
- **SQLite** as the local store, with a typed query layer (Drizzle or SQLx) and **Zod** for form validation
- **Recharts** (or similar) for the stats dashboard

## Roadmap

**Phase 0 — Foundations.** Repo scaffold, SQLite schema + migrations, seed importer that ingests the exported Notion CSVs so the existing history isn't lost.

**Phase 1 — The folio core.** CRUD for all five tables and the one-screen match-entry form with score parsing. This is the MVP; if only this ships, the app is already better than the Notion setup.

**Phase 2 — Stats dashboard.** Win-rate overall and by surface / opponent / club / league; current and longest streaks; tiebreak record; deciding-set record. Charts and filters.

**Phase 3 — Leagues.** Standings/table view derived from league matches, season filters, head-to-head pages per opponent.

**Phase 4 — Later / optional.** Mobile companion; hooks into Apple Health (match duration/calories) and Home Assistant; and — very much in the Wealthfolio spirit — a small **MCP server** so Claude can answer "what's my clay win-rate this season?" straight from the local DB.

## Open questions / decisions

- **Stack**: Tauri desktop (recommended, matches the Wealthfolio ethos) vs. leaning on your Swift/Expo experience for a mobile-first build vs. a pure local web app. Pick one before Phase 0.
- **Name & license**: "Tennisfolio" as the name; AGPL-3.0 (like Wealthfolio) vs. MIT.
- **Scope of v1**: singles only, or doubles too (would need a second opponent/partner on Match)?
- **Seeding**: confirm we start by importing the current Notion export so nothing is retyped.

## How we'll work in Cowork

This file is the source of truth for scope and the data model. Once the repo exists we add a `CLAUDE.md` for build conventions (as you do for your other repos). We iterate in the roadmap order: schema and migrations first, then the match-entry flow, then the dashboard — shipping something usable at the end of Phase 1.