import { expect, request as playwrightRequest, test, type Page } from '@playwright/test'

// Regression test for DAT-183: --court-clay-solid was declared twice per theme
// in index.css (the DAT-168 clay fix, then a stale re-point at --rg-court /
// --rg-court-bright). The later declaration always won, so --secondary under
// the clay accent silently resolved to court green instead of clay on every
// list page's filter chips and table/card toggle. Grass and hard were never
// affected — they re-point --secondary directly in their own [data-accent]
// blocks — which is exactly why the bug slipped through twice before.
//
// This test asserts the *computed* background colour of a --secondary-styled
// control (not the source CSS), converted to a hue, falls in the right family
// per accent. It fails the same way the duplicate did: clay's hue would land
// in grass's ~148° green band instead of its own ~10° red-orange band.

const ACCENTS = ['clay', 'grass', 'hard'] as const
type Accent = (typeof ACCENTS)[number]

// Degrees on the HSL wheel. Wide enough to tolerate oklch->sRGB rounding
// across light/dark, but the three bands never touch — see the hue math in
// the PR description for the actual resolved values (~10°, ~148°, ~210°).
const HUE_RANGES: Record<Accent, [number, number]> = {
  clay: [-20, 45],
  grass: [90, 170],
  hard: [190, 260],
}

const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.WEB_PORT ?? '3000'}`

// oklch -> linear sRGB, per the standard OKLab matrices (css-color-4 §13).
function oklchToSrgb(l: number, c: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b
  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3
  const lin = [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ]
  const toSrgb = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
  }
  return [toSrgb(lin[0]), toSrgb(lin[1]), toSrgb(lin[2])]
}

// The browser's computed backgroundColor may come back as rgb()/rgba() (the
// common case), a hex string, or oklch() — Chromium preserves the oklch()
// notation in getComputedStyle for wide-gamut colours rather than downgrading
// to rgb(), which is exactly the format the accent ramps in index.css use.
function hueOf(color: string): number {
  let r: number
  let g: number
  let b: number

  const oklchMatch = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)

  if (oklchMatch) {
    const [, l, c, h] = oklchMatch
    ;[r, g, b] = oklchToSrgb(Number(l), Number(c), Number(h))
  } else if (rgbMatch) {
    ;[r, g, b] = rgbMatch.slice(1, 4).map((v) => Number(v) / 255)
  } else if (hexMatch) {
    ;[r, g, b] = hexMatch.slice(1, 4).map((v) => parseInt(v, 16) / 255)
  } else {
    throw new Error(`Unexpected computed color format: ${color}`)
  }

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  if (diff === 0) return 0
  let hue: number
  if (max === r) hue = 60 * (((g - b) / diff) % 6)
  else if (max === g) hue = 60 * ((b - r) / diff + 2)
  else hue = 60 * ((r - g) / diff + 4)
  return hue < 0 ? hue + 360 : hue
}

// This package's tsconfig has no "dom" lib (it's a Node/Playwright-only
// project), so browser-context callbacks below reach globals like
// `localStorage` and `getComputedStyle` via `globalThis` rather than the bare
// identifiers `window` / `getComputedStyle`, which TypeScript can't otherwise
// resolve.
async function applyPreferences(page: Page, accent: Accent, theme: 'light' | 'dark') {
  await page.addInitScript(
    ([accentValue, themeValue]) => {
      const global = globalThis as unknown as {
        localStorage: { setItem(k: string, v: string): void }
      }
      global.localStorage.setItem('tennisfolio:accent', accentValue)
      global.localStorage.setItem('tennisfolio:theme', themeValue)
    },
    [accent, theme],
  )
}

// Runs inside the page (via Locator#evaluate) — same globalThis cast as above.
function backgroundColorInBrowser(el: unknown): string {
  const global = globalThis as unknown as {
    getComputedStyle(el: unknown): { backgroundColor: string }
  }
  return global.getComputedStyle(el).backgroundColor
}

test.describe('accent tokens resolve to the correct court-surface hue (DAT-183 regression)', () => {
  test.beforeAll(async () => {
    // A single played match so /matches renders its toolbar (filter chips +
    // view toggle) instead of the data-free empty state.
    const api = await playwrightRequest.newContext({ baseURL })
    const opponentRes = await api.post('/api/opponents', {
      data: { last_name: `AccentCheck-${Date.now()}` },
    })
    const opponent = await opponentRes.json()
    await api.post('/api/matches', {
      data: { match_date: '2026-01-01', opponent_id: opponent.id, score: '6-4 6-4' },
    })
    await api.dispose()
  })

  for (const theme of ['light', 'dark'] as const) {
    for (const accent of ACCENTS) {
      test(`${accent} accent (${theme}): --secondary is ${accent}, never court green`, async ({
        page,
      }) => {
        await applyPreferences(page, accent, theme)
        await page.goto('/matches')

        const [min, max] = HUE_RANGES[accent]

        const allChip = page
          .getByRole('group', { name: 'Match status' })
          .getByRole('button', { name: 'All', exact: true })
        await expect(allChip).toHaveAttribute('aria-pressed', 'true')
        const chipHue = hueOf(await allChip.evaluate(backgroundColorInBrowser))
        expect(chipHue, `filter chip hue for ${accent}/${theme}`).toBeGreaterThanOrEqual(min)
        expect(chipHue, `filter chip hue for ${accent}/${theme}`).toBeLessThanOrEqual(max)

        const tableViewButton = page
          .getByRole('group', { name: 'View mode' })
          .getByRole('button', { name: 'Table view' })
        await expect(tableViewButton).toHaveAttribute('aria-pressed', 'true')
        const toggleHue = hueOf(await tableViewButton.evaluate(backgroundColorInBrowser))
        expect(toggleHue, `view toggle hue for ${accent}/${theme}`).toBeGreaterThanOrEqual(min)
        expect(toggleHue, `view toggle hue for ${accent}/${theme}`).toBeLessThanOrEqual(max)
      })
    }
  }
})
