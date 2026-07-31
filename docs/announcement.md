# Alpha announcement drafts

Copy for the `v0.1.0-alpha` launch. These are drafts for **you** to post — nothing
here is sent automatically. Attach a screenshot or short screen-recording of the
stats dashboard and the one-screen match entry form to each.

Links:
- Landing page: https://nickolaslago.github.io/tennisfolio/
- Repo: https://github.com/nickolaslago/tennisfolio
- Changelog / release notes: https://github.com/nickolaslago/tennisfolio/releases/tag/v0.1.0-alpha

---

## r/selfhosted

**Title:** Tennisfolio — a self-hosted, local-first tennis performance tracker (Alpha)

I built Tennisfolio because I was logging my matches in a Notion workspace and data
entry was painfully slow — every match meant creating and relinking rows by hand.

It's an open-source app for recording and analysing your own tennis matches. The core
idea: **capture a whole match, including every set, from a single screen.** You type the
score (`6-4 3-6 10-7`), it parses the sets, writes everything in one transaction, and
derives the result. From there you get a stats dashboard — win rate, streaks, tiebreak
and deciding-set records, win-rate by surface, ranking-league standings and head-to-head.

It's local-first by design: no account, no cloud, no third-party analytics, no
subscription. Your data lives in a Postgres container you run, and one-click CSV/JSON
export means it's never trapped. There's no cross-device sync — that's deliberate, not a
missing feature.

Install is a one-command `docker compose up` from prebuilt multi-arch (amd64 + arm64)
images:

```sh
curl -O https://raw.githubusercontent.com/nickolaslago/tennisfolio/main/docker-compose.prod.yml
TENNISFOLIO_VERSION=v0.1.0-alpha docker compose -f docker-compose.prod.yml up -d
```

Stack: React + TypeScript, FastAPI, Postgres. AGPL-3.0. This is an Alpha — singles only,
web app only for now, and things may still change between 0.x releases. Feedback very
welcome.

Repo: https://github.com/nickolaslago/tennisfolio

---

## r/tennis

> Check the subreddit's self-promotion / app rules before posting, and skip if not allowed.

**Title:** I built a free, open-source app to track my matches and stats

If you keep track of your matches, I made a free tool for it. You log a match and its
score once, and it works out your win rate, current and longest streaks, tiebreak and
deciding-set records, and how you do on each surface. It also does ranking-league tables
and head-to-head vs specific opponents.

It runs on your own machine — no account, nothing uploaded anywhere, and you can export
everything to CSV/JSON whenever you want. Free and open source.

It's an early Alpha (singles only for now). If you try it I'd love feedback:
https://nickolaslago.github.io/tennisfolio/

---

## Instagram

Caption:

🎾 Tennisfolio is live (Alpha).

An open-source app to track your tennis matches and see your real stats — win rate,
streaks, tiebreak record, surface splits, head-to-heads. Log a match in seconds from one
screen.

Local-first: your data stays on your machine. No account, no cloud, no subscription.
Free and open source.

Link in bio 👇
🔗 nickolaslago.github.io/tennisfolio

#tennis #opensource #selfhosted #tennisstats #buildinpublic

---

## Optional / later

- [selfh.st](https://selfh.st/) — submit for a newsletter/site mention.
- [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted) — open a
  PR adding Tennisfolio under a relevant category (note the AGPL-3.0 license).
- Product Hunt — hold for the Final release (M6), not Alpha.
