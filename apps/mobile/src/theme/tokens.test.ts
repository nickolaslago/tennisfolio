/// <reference types="jest" />
import type { EntityIconColorToken } from '@tennisfolio/core';
import { ENTITY_ICON_COLOR_TOKENS } from '@tennisfolio/core';

import { darkColors, entityIconColor, lightColors } from './tokens';

describe('entityIconColor', () => {
  it('maps every EntityIconColorToken from @tennisfolio/core to a semantic color, in both themes', () => {
    for (const token of ENTITY_ICON_COLOR_TOKENS) {
      expect(entityIconColor(lightColors, token)).toMatch(/^#/);
      expect(entityIconColor(darkColors, token)).toMatch(/^#/);
    }
  });

  it('resolves each token to the semantic color of the same name', () => {
    const expected: Record<EntityIconColorToken, string> = {
      primary: lightColors.primary,
      secondary: lightColors.secondary,
      win: lightColors.win,
      loss: lightColors.loss,
      highlight: lightColors.highlight,
      destructive: lightColors.destructive,
      'muted-foreground': lightColors.mutedForeground,
    };

    for (const token of ENTITY_ICON_COLOR_TOKENS) {
      expect(entityIconColor(lightColors, token)).toBe(expected[token]);
    }
  });

  it('falls back to the theme foreground for an unrecognized token', () => {
    expect(entityIconColor(lightColors, 'not-a-real-token')).toBe(
      lightColors.foreground,
    );
  });
});
