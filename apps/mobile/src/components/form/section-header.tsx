import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  /** Trailing control, e.g. a "See all" link or an icon button. */
  action?: ReactNode;
}

/** A titled section divider used to group related fields, cards, or lists. */
export function SectionHeader({
  title,
  description,
  action,
}: SectionHeaderProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.two }]}>
      <View style={styles.textColumn}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
  },
});
