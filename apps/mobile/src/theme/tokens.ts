/**
 * Roland-Garros palette + semantic color tokens, ported from the two-tier
 * system in `apps/web/src/index.css` (see docs/design-system.md there for the
 * full rationale). Only the "clay" court accent is ported — mobile has no
 * accent picker — and every value here is a flat hex/rgba, since RN has
 * neither CSS custom properties nor `oklch()`/`color-mix()`. Where the web
 * token is defined in oklch, the nearest existing plain-hex value from the
 * same stylesheet is reused (called out below) rather than approximated by
 * eye; where the web token is a translucent "Liquid Glass" surface, the
 * stylesheet's own solid fallback (`@supports not (backdrop-filter: …)`) is
 * used, since RN has no backdrop blur.
 *
 * Never reference these primitives directly from components — consume the
 * semantic `Colors` in `theme.ts` (mirrors index.css's tier separation).
 */

/** Tier 1 — raw palette primitives (`--rg-*` in index.css). */
export const palette = {
  clay: '#C23B22', // Clay Terracotta — primary contrast
  court: '#004B23', // Classic Court Green — secondary contrast
  baseline: '#F1F3F4', // Crisp Baseline White — backgrounds / negative space
  ochre: '#E3783B', // Suntan Ochre — light accent / focus ring
  slate: '#1C2D37', // Dark Slate / Navy — text, borders, primary
  white: '#FFFFFF', // raised surfaces (cards, popovers) in light mode

  // Dark-mode brightened variants (`--rg-*-bright` / `--rg-slate-9/8/7/950`).
  claySlate950: '#101C24',
  slate900: '#1C2D37', // == slate, raised surfaces in dark mode
  slate800: '#24363F', // muted / hover surfaces
  slate700: '#324752', // borders
  clayBright: '#E2694F',
  courtBright: '#2E9E5B',

  // `--court-clay-solid` — clay court deepened, used for filter chips / toggles.
  claySolidLight: '#682518',
  claySolidDark: '#CD624B',

  // `--court-clay-surface` — soft clay wash, used for hover/accent surfaces.
  claySurfaceLight: '#F3DED7',
  claySurfaceDark: '#3A2620',
} as const;

/** Tier 1 — non-color primitives (radius scale, derived from `--radius: 0.625rem`). */
export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  '2xl': 18,
  '3xl': 22,
  '4xl': 26,
  full: 999,
} as const;

export interface SemanticColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  ring: string;
  win: string;
  winForeground: string;
  loss: string;
  lossForeground: string;
  highlight: string;
  highlightForeground: string;
  placeholder: string;
}

/** Tier 2 — semantic tokens, light mode (`:root` in index.css, clay accent). */
export const lightColors: SemanticColors = {
  background: palette.baseline,
  foreground: palette.slate,
  card: palette.white,
  cardForeground: palette.slate,
  border: '#D3D8DB',
  input: '#D3D8DB',
  // Clay's --primary is a near-neutral navy (see index.css's accent-block
  // comment), so it reads as the slate primitive rather than a hue-33 orange.
  primary: palette.slate,
  primaryForeground: palette.baseline,
  secondary: palette.claySolidLight,
  secondaryForeground: palette.baseline,
  muted: '#E4E7E9',
  mutedForeground: '#55636D',
  accent: palette.claySurfaceLight,
  accentForeground: palette.slate,
  destructive: palette.clay,
  ring: palette.ochre,
  win: palette.court,
  winForeground: palette.baseline,
  loss: palette.clay,
  lossForeground: palette.baseline,
  highlight: palette.ochre,
  highlightForeground: palette.slate,
  placeholder: '#55636D',
};

/** Tier 2 — semantic tokens, dark mode (`.dark` in index.css, clay accent). */
export const darkColors: SemanticColors = {
  background: palette.claySlate950,
  foreground: palette.baseline,
  card: palette.slate900,
  cardForeground: palette.baseline,
  border: palette.slate700,
  input: palette.slate700,
  primary: palette.baseline,
  primaryForeground: palette.slate900,
  secondary: palette.claySolidDark,
  secondaryForeground: '#0B140F',
  muted: palette.slate800,
  mutedForeground: '#9AA7AD',
  accent: palette.claySurfaceDark,
  accentForeground: palette.baseline,
  destructive: palette.clayBright,
  ring: palette.ochre,
  win: palette.courtBright,
  winForeground: '#0B140F',
  loss: palette.clayBright,
  lossForeground: '#1A0B08',
  highlight: palette.ochre,
  highlightForeground: palette.slate900,
  placeholder: '#9AA7AD',
};

/** Entity-icon color tokens (`EntityIconColorToken` in @tennisfolio/core) mapped to semantic colors. */
export function entityIconColor(colors: SemanticColors, token: string): string {
  switch (token) {
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.secondary;
    case 'win':
      return colors.win;
    case 'loss':
      return colors.loss;
    case 'highlight':
      return colors.highlight;
    case 'destructive':
      return colors.destructive;
    case 'muted-foreground':
      return colors.mutedForeground;
    default:
      return colors.foreground;
  }
}
