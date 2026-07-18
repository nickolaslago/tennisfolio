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
dark-mode-only extensions like `--rg-slate-950`) and raw scale values like
`--radius: 0.625rem`.

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
- **Liquid Glass surface tokens** — `--glass-surface`/`--glass-surface-foreground`,
  `--glass-border`, `--glass-highlight`, and `--glass-blur`. These describe the
  translucent, frosted treatment shared by every raised surface (cards,
  popovers, menus, dialogs, the sidebar, the mobile tab bar). They're derived
  from the same Roland-Garros primitives — a light `--rg-white` mix in `:root`,
  a `--rg-slate-900` mix in `.dark` — so the brand palette is unchanged; only the
  surface treatment is. The shadcn surface tokens `--card`, `--popover`, and
  `--sidebar` re-point at `--glass-surface`, so the translucency flows through
  every consumer without editing the vendored primitives.

  The colour half of the effect rides these tokens; the non-colour half (the
  `backdrop-filter` blur plus a 1px inner sheen) lives in the `@utility glass`
  class, applied through thin wrappers in `src/components/glass/*` rather than by
  hand-editing `src/components/ui`. Two guards keep text and charts at WCAG AA:
  `@supports not (backdrop-filter: blur(1px))` and
  `@media (prefers-reduced-transparency: reduce)` both re-point `--glass-surface`
  back to the opaque brand colour (and zero the blur), so unsupported browsers
  and reduced-transparency users get solid surfaces.

Each semantic token mostly points at a tier-1 primitive (`--win: var(--rg-court)`),
but a few are one-off UI greys with no reuse elsewhere and hold a literal value
directly (`--muted: #e4e7e9`) — that's fine; not every semantic token needs a
named primitive behind it, but the reverse never holds: primitives are never
skipped over by a component.

`.dark` re-points every tier-2 name at different tier-1 (or literal) values, via
the [`@custom-variant dark`](../apps/web/src/index.css) declaration
(`&:is(.dark *)`, toggled by [`theme-provider.tsx`](../apps/web/src/components/theme-provider.tsx)
adding/removing a `.dark` class on `<html>`). Tier-2 names themselves never
change between light and dark — only what they resolve to.

## Tier 3 — Component mappings (`@theme inline`)

The `@theme inline` block at the top of `index.css` is what actually generates
Tailwind utility classes from tier-2 tokens: `--color-primary: var(--primary)`
produces `bg-primary`, `text-primary`, `border-primary`, etc.; `--radius-lg:
var(--radius)` produces `rounded-lg`; `--font-sans` and `--font-heading` produce
`font-sans` and `font-heading`.

This is the only tier components should consume — as Tailwind utility classes,
not as raw `var(--...)` lookups. The one sanctioned exception is chart code
(`apps/web/src/components/home/*-chart.tsx`), where the Recharts API takes style
props rather than class names — those already reference tokens via
`var(--chart-1)`, `var(--win)`, etc. rather than hex values, so they stay within
the token system even though they can't use a Tailwind class.

### Radius scale

`--radius` (tier 1) is the single dial. `--radius-sm` through `--radius-4xl`
(tier 3) are all `calc()` multiples of it, so nudging one primitive value
rescales every `rounded-*` utility in the app consistently.

### Typography

`--font-sans` (tier 3, currently `'Geist Variable', sans-serif`) is the base
family; `--font-heading` aliases it (`var(--font-sans)`). Components use
`font-heading` for headings and `font-sans` (via the `html { @apply font-sans }`
base rule) for body text — never a literal font-family string. Because
`--font-heading` is a separate variable rather than a duplicate literal, a
future "heading font" user preference (or brand refresh) is a one-line change
to `--font-heading` in `index.css`, with zero component edits.

## Naming conventions

- **Primitives** are prefixed `--rg-` (Roland-Garros) so they're unmistakable in
  a grep and can't be confused with a semantic token.
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
5. **User-facing preferences re-point one token, not the tree.** The theme
   toggle (`--background`/`--foreground` chains) and the `--font-heading` alias
   are the pattern: a single setting flips a single variable, and every
   component using the corresponding Tailwind utility updates for free.
