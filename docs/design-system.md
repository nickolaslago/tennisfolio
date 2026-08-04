# Tennisfolio design system

All styling lives in [`apps/web/src/index.css`](../apps/web/src/index.css), built on
Tailwind v4 and shadcn/ui. It's organised into three token tiers, each layered on
the one before. Components should only ever reach for tier 3 — the Tailwind
utilities — never the raw variables underneath.

```
tier 1: primitives  →  tier 2: semantic tokens  →  tier 3: component mappings
  --rg-clay              --primary                   bg-primary
  --rg-court              --win                       text-win
  --radius: 0.625rem      --radius (inherited)        rounded-lg
```

## Tier 1 — Primitives

Raw reference values: the Roland-Garros brand palette (`--rg-clay`, `--rg-court`,
`--rg-baseline`, `--rg-ochre`, `--rg-slate`, `--rg-white`, plus a handful of
dark-mode-only extensions like `--rg-slate-950`), the three **court-surface
accent ramps** (`--court-clay-*`, `--court-grass-*`, `--court-hard-*` — see
[Accent colour](#accent-colour)), and raw scale values like `--radius: 0.625rem`.

Primitives are defined in `:root` (light) and `.dark` (dark-mode extensions) at
the top of `index.css`, under a `Tier 1 · Primitives` comment header.

**Rule: never reference a `--rg-*` variable, or any other tier-1 primitive,
directly in component code (Tailwind arbitrary values, inline `style`, etc.).**
Primitives only exist to give tier 2 something to point at. If a component needs
a colour, radius, or font, it reaches for a tier-2/tier-3 name instead — that's
what makes re-theming (dark mode today; a user accent choice or the future Expo
app tomorrow) a matter of re-pointing a variable, not editing components.

## Tier 2 — Semantic tokens

Named by UI role, not by palette colour, and split into two families:

- **The shadcn/ui contract** — `--background`, `--foreground`, `--card`,
  `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`,
  `--border`, `--input`, `--ring`, `--chart-1`…`--chart-5`, `--sidebar*`. These
  names are fixed by shadcn's components and Tailwind config — don't rename them.
- **Tennisfolio brand tokens** — `--surface`/`--surface-foreground`,
  `--win`/`--win-foreground`, `--loss`/`--loss-foreground`,
  `--highlight`/`--highlight-foreground`. Match/set results are a first-class
  domain concept here (green = win, clay = loss), so they get dedicated tokens
  instead of being expressed as ad-hoc colours wherever a result is rendered.
- **Chart roles** — `--chart-accent` (the emphasis series), `--chart-neutral`
  (supporting series) and `--chart-grid` (grid lines, hover cursor), on top of
  shadcn's categorical `--chart-1`…`--chart-5`. Charts are the one place that
  reads tokens by name rather than through a utility class, so the roles they
  read are named for what they do in a chart.
- **Chrome tokens** — `--ambient` (with the `--ambient-1/2/3` washes it is built
  from) and `--theme-color`, the opaque colour of the page's top edge that
  [`lib/theme-color.ts`](../apps/web/src/lib/theme-color.ts) mirrors into
  `<meta name="theme-color">` so a mobile browser's top bar matches the app.

Each semantic token mostly points at a tier-1 primitive (`--win: var(--rg-court)`),
but a few are one-off UI greys with no reuse elsewhere and hold a literal value
directly (`--muted: #e4e7e9`) — that's fine; not every semantic token needs a
named primitive behind it, but the reverse never holds: primitives are never
skipped over by a component.

`.dark` re-points every tier-2 name at different tier-1 (or literal) values, via
the [`@custom-variant dark`](../apps/web/src/index.css) declaration
(`&:is(.dark *)`, toggled by [`theme-provider.tsx`](../apps/web/src/components/theme-provider.tsx)
adding/removing a `.dark` class on `<html>`). Tier-2 names themselves never
change between light and dark — only what they resolve to. The light values
are scoped `:root, .light`, so a `.light` wrapper inside a dark subtree
restores them for that subtree — used by the Settings theme preview cards to
mock each theme regardless of the active one.

## Tier 3 — Component mappings (`@theme inline`)

The `@theme inline` block at the top of `index.css` is what actually generates
Tailwind utility classes from tier-2 tokens: `--color-primary: var(--primary)`
produces `bg-primary`, `text-primary`, `border-primary`, etc.; `--radius-lg:
var(--radius)` produces `rounded-lg`; `--font-sans` and `--font-heading` produce
`font-sans` and `font-heading`.

This is the only tier components should consume — as Tailwind utility classes,
not as raw `var(--...)` lookups. The one sanctioned exception is chart code
(`apps/web/src/components/home/*-chart.tsx`), where the Recharts API takes style
props rather than class names — those reference tokens via `var(--chart-accent)`,
`var(--chart-grid)`, etc. rather than hex values, so they stay within the token
system even though they can't use a Tailwind class.

### Radius scale

`--radius` (tier 1) is the single dial. `--radius-sm` through `--radius-4xl`
(tier 3) are all `calc()` multiples of it, so nudging one primitive value
rescales every `rounded-*` utility in the app consistently.

### Typography

Font families follow the same three tiers as colour. Tier 1 holds the raw
stacks (`--font-instrument-sans`, `--font-instrument-serif`,
`--font-ubuntu-mono`, loaded via `@fontsource` imports). Tier 2 is
`--font-app` — the single active family, defaulting to Instrument Sans and
re-pointed by the user's font preference via a `data-font` attribute on
`<html>` (set by [`font-provider.tsx`](../apps/web/src/components/font-provider.tsx),
persisted under `tennisfolio:font`), exactly like the theme toggles `.dark`.
Tier 3 exposes `--font-sans: var(--font-app)`, with `--font-heading` aliasing
it (`var(--font-sans)`). Components use `font-heading` for headings and
`font-sans` (via the `html { @apply font-sans }` base rule) for body text —
never a literal font-family string. The `--font-option-*` mappings
(`font-option-sans`, …) render each selectable family in the settings picker,
the same way `--radius-lg: var(--radius)` maps a tier-1 scale value straight
into a utility.

### Accent colour

The accent preference works like the font one, one level up: a `data-accent`
attribute on `<html>` (set by
[`accent-provider.tsx`](../apps/web/src/components/accent-provider.tsx),
persisted under `tennisfolio:accent`, and re-applied by the boot script in
`index.html` so first paint is already correct) selects one of three
**court-surface ramps** — clay (the default, and so the no-attribute case),
grass and hard.

A ramp is a tier-1 group covering eight roles, which between them cover every
accent-driven surface in the app:

| ramp role         | tier-2 tokens it feeds                    | what that colours                              |
| ----------------- | ----------------------------------------- | ---------------------------------------------- |
| `primary`         | `--primary`, `--sidebar-primary`          | buttons, links, active nav, skip link          |
| `signature`       | `--ring`, `--sidebar-ring`, `--highlight` | focus rings, call-outs, active pills           |
| `surface`         | `--accent`                                | hovered menu rows                              |
| `sidebar-surface` | `--sidebar-accent`                        | sidebar rows, the mobile tab bar's active tab  |
| `solid`           | `--secondary`                             | filter chips and toolbar toggles on list pages |
| `chart`           | `--chart-accent`                          | the emphasis series in the home charts         |
| `wash-1/2/3`      | `--ambient-1/2/3`                         | the app-shell backdrop gradient                |
| `chrome`          | `--theme-color`                           | the mobile browser's top bar                   |

Clay reuses the Roland-Garros primitives, so it is the palette the app shipped
with; grass and hard mirror it role by role in oklch, holding each role's
lightness — and so its contrast against whatever it sits on — and rotating the
hue to green (~150) / blue (~250).

`.dark` re-points the ramps themselves, which is what keeps the wiring small:
each accent needs exactly one block, and it serves light and dark alike.
Those blocks also carry `.light` / `.dark` descendant selectors so the accent
reaches scoped subtrees — the Settings theme previews re-declare tier 2 for
their own theme and would otherwise fall back to clay.

What deliberately does _not_ follow the accent: `--win`/`--loss` and
`--destructive`. Those are domain colours, not decoration — recolouring "wins"
per accent would put it next to an almost identical "losses" under the clay
accent, and the win/loss legend would stop meaning anything.

## Liquid Glass surfaces

Raised surfaces (cards, popovers, dropdown menus, dialogs, the desktop
sidebar, the mobile tab bar, chart tooltips) use a translucent "Liquid Glass"
treatment instead of flat `--rg-white` fills. It's built from four tier-2
tokens — `--glass-surface`, `--glass-border`, `--glass-highlight`,
`--glass-blur` — plus `--ambient`, the accent-hued backdrop wash the glass
refracts (painted once by the app shell via the `bg-ambient` utility). All are
derived from tier-1 palette primitives with `color-mix()`, and `.dark`
re-points them like every other tier-2 token. `--ambient` holds the gradient's
geometry only; its three colours come from `--ambient-1/2/3`, which the accent
blocks re-point, so switching accent re-tints the backdrop without restating
the gradient.

The colour half flows through the existing shadcn contract:
`--card`/`--popover`/`--sidebar` point at `--glass-surface`, so vendored
primitives pick it up untouched. The non-colour half (backdrop-blur +
saturation + inner top sheen) is the tier-3 `glass` utility, applied by the
wrappers in [`src/components/glass/`](../apps/web/src/components/glass/) —
import raised surfaces from there (`@/components/glass/card`, …), never by
hand-editing `src/components/ui/*`. The sheen rides Tailwind's
`--tw-inset-shadow` slot so it composes with each surface's own ring/shadow.

Fallbacks: `@supports not (backdrop-filter: blur(1px))` and
`@media (prefers-reduced-transparency: reduce)` re-point `--glass-surface`
(and `--glass-border`) back to the opaque values, so unsupported browsers and
users who opt out get the pre-glass solid surfaces at full WCAG AA contrast —
again a token re-point, with zero component branches.

## Naming conventions

- **Primitives** are prefixed `--rg-` (Roland-Garros) — or `--court-<accent>-`
  for the accent ramps — so they're unmistakable in a grep and can't be confused
  with a semantic token. The `court-swatch-*` classes behind the accent picker
  take the same prefix for a second reason: `tailwind-merge` reads an `accent-`
  prefix as the accent-color utility group and would collapse two such classes
  on one element into one.
- **Semantic tokens** are un-prefixed, named for role (`--win`, `--border`), and
  come in `--x` / `--x-foreground` pairs when they're a fill that needs
  accessible text on top of it.
- **Component mappings** follow Tailwind v4's own convention:
  `--color-*` → `bg-*`/`text-*`/`border-*`/etc., `--radius-*` → `rounded-*`,
  `--font-*` → `font-*`.

## Rules

1. **Never reference `--rg-*` (or any tier-1 primitive) in component code.**
   Consume tier-3 Tailwind utilities (`bg-win`, `rounded-lg`, `font-heading`).
   The chart components' `var(--chart-1)`-style references to tier-2 tokens are
   the sanctioned exception described above — but they still never reach past
   tier 2 into `--rg-*`.
2. **No hardcoded hex colours, radii, or font-family strings in component
   files.** If a value isn't already a token, it either belongs in Tailwind's
   default scale (spacing, sizing) or needs a new semantic token — it doesn't
   get inlined as an arbitrary value or `style` prop.
3. **`.dark` only re-points tier-1/tier-2 variables — it never introduces a new
   tier-2 name that doesn't exist in `:root`.** Keeps the two themes structurally
   identical, so components never need to branch on theme.
4. **`src/components/ui/*` is vendored shadcn output.** Don't hand-edit those
   files beyond what `shadcn add` generates; if a primitive needs to reach a
   vendored component, do it by re-pointing the token it already consumes, not
   by editing the component.
5. **User-facing preferences re-point tokens, not components.** The theme
   toggle (`--background`/`--foreground` chains), the `--font-app` alias and the
   accent picker (tier 2 → one court ramp) are the pattern: a setting flips
   variables, and every component using the corresponding Tailwind utility
   updates for free. A surface that doesn't follow a preference is a wiring bug
   in `index.css`, not something to branch on in a component.
