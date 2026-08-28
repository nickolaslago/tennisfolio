import { Fonts, Spacing } from '@/constants/theme';

import { darkColors, lightColors, radii, type SemanticColors } from './tokens';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: SemanticColors;
  radii: typeof radii;
  spacing: typeof Spacing;
  fonts: typeof Fonts;
}

export const themes: Record<ColorScheme, Theme> = {
  light: {
    scheme: 'light',
    colors: lightColors,
    radii,
    spacing: Spacing,
    fonts: Fonts,
  },
  dark: {
    scheme: 'dark',
    colors: darkColors,
    radii,
    spacing: Spacing,
    fonts: Fonts,
  },
};

export { darkColors, lightColors, radii };
export { entityIconColor, palette, type SemanticColors } from './tokens';
