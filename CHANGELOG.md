# Changelog

All notable changes to Tennisfolio are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and from this release
onward the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Trusted release pipeline for the published Docker images: SLSA build provenance
  (`mode=max`) and SPDX SBOM attestations, keyless cosign signing of every pushed digest
  via GitHub OIDC, a Trivy scan that fails the release on fixable HIGH/CRITICAL CVEs, and
  an opt-in Docker Hub mirror alongside GHCR. The README documents how to verify all of it.

## [0.1.0-alpha] — 2026-07-31

The first public release of Tennisfolio — an open-source, local-first tennis
performance tracker. Log your matches in seconds, read rich stats, and keep every
row on a machine you own. No account, no cloud, no subscription.

This is an **Alpha**: the folio core, the stats dashboard and the self-hosted
install are all in place and usable day-to-day. Expect rough edges, and see the
Known limitations below before you rely on it.

### What's included

**One-screen match entry — the core feature.**
- Capture a whole match, including every set, from a single form.
- Structured score fields with a parser that accepts standard and early-clinch
  set counts (e.g. `6-4 3-6 10-7`), then writes the match and its linked sets in
  one transaction.
- Opponent, club → court (scoped to the club), and optional tournament + stage.

**The folio.**
- CRUD for all six entities — Opponents, Clubs, Courts, Tournaments, Matches, Sets.
- Clubs own multiple courts, each a unique (surface, environment) pair.
- Match detail page with a set-by-set breakdown; results and score strings are
  always **derived**, never stored redundantly.
- Assignable emoji/icons for opponents, clubs and tournaments.

**Stats dashboard.**
- Win rate, current and longest streaks, tiebreak record and deciding-set record.
- Matches-played series and win-rate-by-surface charts on the home dashboard.
- Ranking-league standings and per-opponent head-to-head views.

**Tournaments.**
- Knockout and ranking-league formats, with organiser and a virtual "Friendlies"
  entry for casual matches.

**Settings.**
- General, Appearance (light/dark theme, accent colour, font) and Backup & Export.
- One-click export to CSV and JSON, plus data import, and a delete-all-data action.
- Interface strings extracted for internationalisation (react-i18next).

**Self-hosting.**
- `docker compose up` builds the whole stack from source (Postgres + API + web).
- One-command install from prebuilt, multi-arch (amd64 + arm64) images published
  to GHCR on every tagged release — see the README quickstart.
- Runs fully offline; match data lives in a Postgres volume you control, or point
  the API at your own external Postgres.

**Project.**
- [Landing page](https://nickolaslago.github.io/tennisfolio/) on GitHub Pages.
- CI (ruff + pytest, eslint + build, vitest) and a Playwright end-to-end smoke
  suite that boots the full Docker stack.

### Known limitations

- **Single device, no sync — by design.** Tennisfolio is local-first; your data
  stays on the machine you run it on. There is no cloud account and no
  cross-device sync (see the distribution decision in DAT-128). Back up the
  Postgres volume yourself, or use the built-in CSV/JSON export.
- **Singles only.** Doubles is not modelled yet.
- **Web app only.** No mobile companion app in this release (planned for Beta).
- **Alpha quality.** APIs, schema and UI may still change between `0.x` releases.

### Install

```sh
curl -O https://raw.githubusercontent.com/nickolaslago/tennisfolio/main/docker-compose.prod.yml
TENNISFOLIO_VERSION=v0.1.0-alpha docker compose -f docker-compose.prod.yml up -d
```

Web: http://localhost:3000 · API: http://localhost:8000/docs

[Unreleased]: https://github.com/nickolaslago/tennisfolio/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/nickolaslago/tennisfolio/releases/tag/v0.1.0-alpha
