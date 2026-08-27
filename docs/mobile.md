# Mobile app (`apps/mobile`)

The Tennisfolio mobile client is an [Expo](https://expo.dev) (React Native +
TypeScript) app targeting **iOS and Mac**. It lives at `apps/mobile` as the
`@tennisfolio/mobile` workspace package and consumes the shared domain logic
(score parser, formatting, types, entity icons) from `@tennisfolio/core` — the
same package the web app uses — via the `workspace:*` protocol. No scoring or
domain logic is re-implemented in the app.

## Quick start

From the repo root (or `cd apps/mobile`):

```bash
pnpm dev:mobile            # start the Metro dev server (expo start)
pnpm --filter @tennisfolio/mobile typecheck
pnpm --filter @tennisfolio/mobile lint
pnpm --filter @tennisfolio/mobile test
```

### Boot in the iOS Simulator

Requires macOS with Xcode + an iOS Simulator installed.

```bash
# From the repo root:
pnpm ios:mobile
# or, equivalently, from apps/mobile:
cd apps/mobile && npx expo run:ios
```

`expo run:ios` generates the native `ios/` project on first run (via prebuild),
compiles it, and launches it in the Simulator. If you already have a compatible
[development build](https://docs.expo.dev/develop/development-builds/introduction/)
installed you can instead run `pnpm dev:mobile` and press `i` to open it in the
booted Simulator.

### Run as a Mac build ("Designed for iPad")

On an Apple-Silicon Mac the same iOS binary runs natively — no separate target.

```bash
cd apps/mobile
npx expo run:ios          # generates the ios/ project, then open it in Xcode:
open ios/*.xcworkspace
```

In Xcode, set the run destination to **My Mac (Designed for iPad)** and press
Run. The app installs and launches as a Mac application. See the Mac strategy
section below for why this is the chosen path.

## Navigation: Expo Router (chosen) vs bare React Navigation

The bottom-tab skeleton — **Home, Matches, Opponents, Clubs, Tournaments** — is
built with **[Expo Router](https://docs.expo.dev/router/introduction/)** (its
`Tabs` navigator), not bare React Navigation.

- **Expo Router is the Expo-blessed default** and is what `create-expo-app`
  scaffolds. It is a thin, file-based layer *on top of* React Navigation, so we
  still get React Navigation's mature native navigators underneath while writing
  less boilerplate.
- **File-based routing** maps each screen to a file in `src/app/`. A tab is a
  file (`matches.tsx`) registered in one `src/app/_layout.tsx`; adding the real
  screens in DAT-98 is "drop a file in, add a `Tabs.Screen`", with no central
  route table to keep in sync.
- **Typed routes** (`experiments.typedRoutes`) give us compile-time-checked
  links and params — a good fit for the repo's strict-TypeScript convention.
- **Deep linking and universal links** come essentially for free, which we will
  want for share links into matches/tournaments.

Bare React Navigation would mean hand-wiring a navigation container, linking
config, and a route registry for no functional gain here. If we ever needed a
navigator Expo Router doesn't expose, we could still drop down to React
Navigation directly, since it is the underlying library.

> Note: SDK 57 also ships an `unstable-native-tabs` API (true UIKit
> `UITabBarController`). It renders a more platform-native bar (and a nice Mac
> tab bar under Catalyst), but it is explicitly unstable and needs per-tab image
> or SF-Symbol assets. We chose the stable JS `Tabs` for the scaffold — with
> `@expo/vector-icons` (Ionicons) for tab icons — and can revisit native tabs
> once the screens firm up.

## The pnpm-monorepo Metro wiring (the main risk)

pnpm uses an **isolated** `node_modules` (a symlinked virtual store under
`<root>/node_modules/.pnpm`) rather than the flat tree npm/yarn produce. Metro's
defaults assume the flat layout, so `apps/mobile/metro.config.js` makes three
adjustments (see the comments in that file for the full rationale):

1. **`watchFolders = [workspaceRoot]`** — so Metro watches (and can read) the
   whole monorepo, including `packages/core`.
2. **`resolver.nodeModulesPaths = [app, workspaceRoot]`** — resolve the app's
   own dependencies first, then the root store. Ordering matters: it keeps the
   app on **React 19** even though `apps/web` pins **React 18** in the same
   workspace.
3. **Hierarchical lookup left *enabled*** — we deliberately do **not** set
   `resolver.disableHierarchicalLookup`. Under pnpm, a package's transitive
   dependencies (e.g. `expo-router` requiring `@expo/metro-runtime`) are
   symlinked into that package's own `node_modules` inside the `.pnpm` store,
   not hoisted to the app or root `node_modules`. Hierarchical lookup is what
   lets Metro walk up from the requiring file into the store and find them;
   disabling it breaks the bundle with `Unable to resolve @expo/metro-runtime`.

Notably we **do not** set `node-linker=hoisted`. Flattening the store is the
other common pnpm+Expo recipe, but it would force a single hoisted React version
across the whole workspace and collide with the web app's React 18. Keeping the
isolated store plus the Metro config above preserves that isolation.

TypeScript resolves `@tennisfolio/core` the same way the web app does — through
the `workspace:*` symlink and the package's `types` entry (`src/index.ts`) —
with no path aliases needed for it.

### Proof the wiring works

`src/app/matches.tsx` imports `summarizeMatch` from `src/lib/match-summary.ts`,
which is a thin adapter over `@tennisfolio/core`'s `parseScore` /
`computeMatchResult` / `formatScore`. The screen parses the sample score
`"6-4 3-6 10-7"` and renders the derived result (a **Win**, 2–1 in sets, final
set flagged as a tiebreak). The same adapter is unit-tested in
`src/lib/match-summary.test.ts` (jest-expo), so the workspace link is exercised
by both Metro and the test runner.

## Mac strategy: "Designed for iPad" (recommended)

Three ways to put a React Native/Expo app on the Mac were considered:

| Option | What it is | Effort in this stack | Verdict |
| --- | --- | --- | --- |
| **Designed for iPad** | The unmodified iOS/iPad app binary runs on Apple-Silicon Macs. | Set `ios.supportsTablet: true` + a bundle id. Works in the managed Expo workflow with **zero native changes**. | ✅ **Chosen** |
| **Mac Catalyst** | UIKit-for-Mac target that produces a more "Mac-native" app (menu bar, window chrome). | Requires `expo prebuild`, an added Xcode Catalyst target, entitlements, and per-library Catalyst support. Not configurable from `app.json` alone; ongoing native maintenance. | Revisit later |
| **Native macOS (`react-native-macos`)** | Microsoft's separate AppKit renderer. | A **second renderer/target**, not supported by Expo's managed workflow or most Expo modules. Effectively a parallel app. | Rejected |

**Recommendation: "Designed for iPad."** It is the lowest-friction path that
satisfies the acceptance criterion "runs as a Mac build": the exact binary we
ship to the App Store also runs on M-series Macs, we keep the fully-managed Expo
workflow (no committed `ios/` folder, no Catalyst maintenance), and there is one
codebase and one UI to reason about. Its tradeoff is that the app presents as an
iPad app on the Mac (touch-oriented layout, no bespoke Mac menus/window
management). That is an acceptable starting point; if Tennisfolio later wants a
first-class desktop experience, **Mac Catalyst** is the natural next step (it
reuses this same codebase), whereas native macOS would be a separate app and is
not planned.

Configuration for the chosen strategy lives in `app.json`:

```jsonc
"ios": {
  "supportsTablet": true,          // enables iPad → "Designed for iPad" on Mac
  "bundleIdentifier": "app.tennisfolio.mobile"
}
```

## Local-first storage (DAT-97)

The app is **local-first**: every screen reads and writes an on-device SQLite
database, and works with the network off. It is not a thin client over the
hosted API — per the Wealthfolio-model decision in DAT-128, each client embeds
its own database, and the hosted API becomes an optional sync peer in the Cloud
Connect milestone (M5).

```
src/db/                      storage — nothing above this line writes SQL
├── sqlite.ts                the SqliteConnection contract + Database (transactions)
├── drivers/expo.ts          on device: expo-sqlite
├── drivers/node.ts          in tests: node:sqlite
├── migrations/              versioned, forward-only schema steps
├── migrate.ts               the runner (PRAGMA user_version + schema_migrations)
├── database.ts              the app's single open-and-migrate handle
├── ids.ts                   UUID v4, generated on device
└── time.ts                  the two ISO string formats the schema stores

src/lib/repositories/        the boundary screens see
src/lib/transfer/            CSV import/export, interchangeable with /export/csv
src/hooks/use-repositories   how a screen gets a repository set
```

### expo-sqlite (chosen) vs OP-SQLite

**`expo-sqlite`.** Both are good libraries wrapping the same engine; the
deciding factors were workflow and support surface, not raw speed.

| | `expo-sqlite` | OP-SQLite |
| --- | --- | --- |
| Workflow | First-party Expo module, versioned with the SDK. Installs with `npx expo install`, works in Expo Go and dev builds, no config plugin. | Third-party; needs a dev build (fine — we already build one) and tracks RN releases on its own schedule. |
| Performance | Async API off the JS thread; ample for a personal match log measured in thousands of rows. | Faster on large workloads via JSI, plus niche features (SQLCipher, libSQL, reactive queries) we do not need today. |
| Risk | Upgrades move with the Expo SDK we already upgrade in lockstep. | One more native dependency that can block an SDK bump. |

Nothing about the choice leaks past `src/db/drivers/expo.ts`: it implements the
same `SqliteConnection` contract the Node test driver does, so switching to
OP-SQLite later would mean writing one file, not touching the repositories, the
migrations, or a single screen. If a future feature does need encryption at rest
or sub-millisecond bulk reads, that is when to revisit it.

### The schema mirrors the API

`src/db/migrations/001-initial-schema.ts` reproduces
[`apps/api/src/app/models/`](../apps/api/src/app/models/) table for table —
opponents, clubs, courts, tournaments, matches, sets — with the same columns,
nullability, indexes, unique constraints and foreign-key actions, and the enums
from `enums.py` as `CHECK` lists. `src/db/migrate.test.ts` pins all of that, so
a server-side change this app has not followed fails in CI rather than on a
phone. Four deliberate differences, all forced by running on a device:

1. **Text UUID primary keys** instead of Postgres sequences (see below).
2. **`created_at` / `updated_at` on `sets` too.** The API's `Set` model has no
   timestamps because a set only ever changes as part of its match; a sync
   engine reconciles rows, not aggregates, so every table carries both here.
3. **Enums as `TEXT` + `CHECK`**, since SQLite has no enum type.
4. **A `deletions` tombstone table** (see below).

Migrations are forward-only and tracked twice: `PRAGMA user_version` is the
authority (a constant-time "is this up to date?" on every launch, written in the
migration's own transaction), and `schema_migrations` records which name was
applied when, for support logs. There are no `down` migrations — a phone cannot
roll back to a previously-installed binary, so a bad migration is fixed by
shipping the next one.

### Sync-ready, without any sync

No sync engine is built here. These three decisions just avoid painting M5 into
a corner:

- **UUID primary keys, minted on device** (`src/db/ids.ts`, via the platform's
  WebCrypto). Two phones and a hosted database can each create rows offline and
  merge later without renumbering anything or a round-trip to allocate an id.
- **`updated_at` maintained on every write.** Every INSERT sets it and every
  UPDATE goes through `buildUpdate`, which always stamps it. It is the
  last-writer-wins clock a sync engine needs, and it is UTC so a phone crossing
  a timezone cannot reorder its own history.
- **Deletions leave a tombstone.** A replica that simply forgets a deleted row
  gets it back on the next sync. Every table has an `AFTER DELETE` trigger
  writing `(entity_type, entity_id, deleted_at)` into `deletions`, so deletions
  are captured however they happen — a repository call, a wipe-and-replace
  import, or a foreign-key cascade. Cascades are why the connection sets
  `PRAGMA recursive_triggers = ON`; without it, deleting a club would record the
  club and silently lose its courts.

### The repository layer

`src/lib/repositories` exposes the **same operations, arguments and result
shapes as the web API client** in
[`apps/web/src/lib/api/*.ts`](../apps/web/src/lib/api), returning types from
`@tennisfolio/core`:

| Module | Operations |
| --- | --- |
| `clubs.ts` | `listClubs`, `getClub`, `createClub`, `updateClub`, `deleteClub` |
| `opponents.ts` | `listOpponents`, `getOpponent`, `createOpponent`, `updateOpponent`, `deleteOpponent` |
| `tournaments.ts` | `listTournaments`, `getTournament`, `getTournamentStandings`, `createTournament`, `updateTournament`, `deleteTournament` |
| `matches.ts` | `listMatches`, `getMatch`, `createMatch`, `updateMatch`, `deleteMatch` |
| `data.ts` | `deleteAllData`, `exportCsvBundle`, `importCsvBundle` |

Courts and sets have no repository of their own for the same reason the API has
no `/courts` or `/sets` endpoint: a court is managed inline on its club (create
takes a nested `courts` list; update diffs it), and a set is managed inline on
its match. Filters, ordering, pagination limits (1–200, default 50) and the
`Page<T>` envelope all match the API's routers, and failures throw a
`RepositoryError` carrying the **same status code and message** the API would
have returned — `404` for a missing row, `409` for deleting an opponent that has
matches, `422` for an invalid score or a court that is not the match's club's.

Screens use `useRepositories()` and nothing below it. That is enforced, not just
asked for: `eslint.config.js` bans importing `@/db/*` or `expo-sqlite` from
`src/app/**` and `src/components/**`.

Three differences from the web client are worth knowing:

- **Ids are strings** (device UUIDs) where the hosted API uses integers. This is
  why the shared entity types live in `@tennisfolio/core` with `id: string`;
  `apps/web` keeps its own numeric-id types until the API moves to UUIDs.
- **`importCsvBundle` / `exportCsvBundle` take and return CSV text**, not a
  `File` and a browser download. Zipping, saving and sharing are a separate
  concern that should not reach into SQLite.
- **`ImportResult` includes `courts`**, which the web client's type omits even
  though the API returns it.

### Derived data is still never stored

A match's **result**, **score string**, **set breakdown**, **surface** and
**match type** are computed on every read — the first three by
`@tennisfolio/core`'s `parseScore` / `computeMatchResult` / `formatScore`, the
same parser the web app uses and the API mirrors in Python. Only the set rows
are persisted. `createMatch` / `updateMatch` accept either a `score` string or
nested `sets`, and normalise both through that one parser, so neither can store
something the other would reject.

### Import / export

`exportCsvBundle()` produces the six CSVs of `GET /export/csv` and
`importCsvBundle()` consumes them, both to the letter of
[`docs/data-export.md`](./data-export.md): `DD-MM-YYYY` dates, `true`/`false`
booleans, empty cells for null, the `handeness` header typo, the `clu-`/`cou-`/
`opp-`/`tou-`/`mat-`/`set-` local ids, CRLF line endings and Python's
`QUOTE_MINIMAL` quoting. Import is a **wipe and replace** in one transaction,
and reports the same `ImportResult` the API's `POST /import` does, skip reasons
included. The per-entity rules — upsert on a natural key, skip a row whose
references the bundle does not define, null an unreadable enum on an opponent
but skip the row anywhere else, validate set scores with `validate_set` — are
ported one for one from `app/seed_import.py`, including its acceptance of the
seed data's colloquial `Fast` surface as `Hard`.

Where the API numbers local ids from its integer primary keys, this app numbers
them 1..N in insertion order, which is all the format requires (they only have
to be consistent inside one bundle). `src/lib/transfer/round-trip.test.ts`
imports a real Docker-PoC export and asserts the re-export matches it **byte for
byte**, file by file.

Two columns the local schema stores are absent from the bundle because the API
does not export them either: a tournament's `organiser` and every entity's
`icon`. A bundle round-tripped through this format drops them, on device exactly
as on the server.

### Tests

`pnpm --filter @tennisfolio/mobile test` runs the whole storage layer against a
real SQLite engine — `node:sqlite` through the same `SqliteConnection` contract
`expo-sqlite` implements, so migrations, foreign keys, CHECK constraints,
triggers and the CSV round-trip are exercised for real rather than mocked. No
simulator required.

## Scripts

Root `package.json` exposes the mobile app alongside the web scripts:

| Script | Runs |
| --- | --- |
| `pnpm dev:mobile` | `expo start` (Metro dev server) |
| `pnpm ios:mobile` | `expo start --ios` (open in the iOS Simulator) |
| `pnpm lint:mobile` | `expo lint` |
| `pnpm typecheck:mobile` | `tsc --noEmit` |
| `pnpm test:mobile` | `jest` (jest-expo preset) |

Inside `apps/mobile`, the same are available unprefixed (`pnpm dev`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, plus `pnpm ios` / `pnpm android` / `pnpm web`).
