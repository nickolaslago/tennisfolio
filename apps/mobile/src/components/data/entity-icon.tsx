import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';

import { parseEntityIcon } from '@tennisfolio/core';

import { entityIconColor, useTheme } from '@/theme';

import { ENTITY_ICON_GLYPHS } from './entity-icon-map';

/**
 * Decodes a stored `icon` value (see `@tennisfolio/core`'s `entity-icon.ts`)
 * and renders the emoji or a tinted icon. Renders nothing when the value is
 * unset or malformed, mirroring `apps/web/src/components/data/entity-icon.tsx`.
 */
export function EntityIcon({
  value,
  size = 16,
}: {
  value: string | null | undefined;
  size?: number;
}) {
  const { colors } = useTheme();

  let parsed;
  try {
    parsed = parseEntityIcon(value);
  } catch {
    return null;
  }
  if (!parsed) return null;

  if (parsed.kind === 'emoji') {
    return (
      <Text style={[styles.emoji, { fontSize: size, lineHeight: size * 1.2 }]}>
        {parsed.emoji}
      </Text>
    );
  }

  return (
    <MaterialCommunityIcons
      name={ENTITY_ICON_GLYPHS[parsed.name]}
      size={size}
      color={entityIconColor(colors, parsed.color)}
    />
  );
}

const styles = StyleSheet.create({
  emoji: {
    includeFontPadding: false,
  },
});
