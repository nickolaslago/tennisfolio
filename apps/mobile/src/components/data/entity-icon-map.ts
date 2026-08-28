/**
 * Maps the curated `EntityIconName`s from `@tennisfolio/core`'s `entity-icon.ts`
 * to `MaterialCommunityIcons` glyphs — the closest visual match to the
 * lucide-react icon set `apps/web/src/lib/entity-icons.ts` renders on web. The
 * icon *names, colors and encoding* are never redrawn here, only mapped to a
 * glyph in an icon set this app already ships (`@expo/vector-icons`).
 */
import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { EntityIconName } from '@tennisfolio/core';

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const ENTITY_ICON_GLYPHS: Record<EntityIconName, GlyphName> = {
  trophy: 'trophy',
  award: 'trophy-award',
  medal: 'medal',
  star: 'star',
  crown: 'crown',
  flag: 'flag',
  target: 'target',
  swords: 'sword-cross',
  dumbbell: 'dumbbell',
  gauge: 'gauge',
  'map-pin': 'map-marker',
  'building-2': 'office-building',
  landmark: 'bank',
  home: 'home',
  globe: 'earth',
  compass: 'compass',
  mountain: 'terrain',
  'tree-pine': 'pine-tree',
  waves: 'waves',
  palmtree: 'palm-tree',
  sun: 'weather-sunny',
  'cloud-sun': 'weather-partly-cloudy',
  umbrella: 'umbrella',
  snowflake: 'snowflake',
  zap: 'flash',
  flame: 'fire',
  shield: 'shield',
  rocket: 'rocket-launch',
  sparkles: 'star-four-points',
  users: 'account-group',
};
