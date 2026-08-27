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
