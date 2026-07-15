---
name: verify
description: Build, launch, and drive the Tennisfolio web app to verify changes end-to-end.
---

# Verifying apps/web

## Launch

```bash
cd apps/web
pnpm dev > /tmp/vite.log 2>&1 &   # Vite dev server on http://localhost:5173
```

Ready in <1s; check the log for the "ready" line. `pnpm build && pnpm preview`
works too but dev is faster and enough for verification.

## Drive (headless Chromium)

Playwright 1.56 is installed globally (`/opt/node22/lib/node_modules`), browsers
under `/opt/pw-browsers`. The repo has no Playwright dep, so use the global one
via `createRequire` and pass the executable path explicitly:

```js
import { createRequire } from 'module'
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
```

Gotcha: `/opt/pw-browsers/chromium/` is not the executable dir — use the
versioned `chromium-1194/chrome-linux/chrome` (re-check the suffix with
`ls /opt/pw-browsers` if it 404s).

## Flows worth driving

- Desktop (1280px): sidebar visible, bottom tab bar hidden; click each nav tab
  and assert `document.title` and `aside a[aria-current="page"]`.
- Resize to 390px **without reload** (set a `window.__marker` first and assert
  it survives): sidebar hides, bottom bar shows.
- Cold deep links: `/opponents/:id` etc. load directly; unknown routes hit the
  404 page.
- Keyboard: first Tab hits the skip link; Tab into nav links, Enter navigates.
- Listen for `pageerror` / console errors throughout.
