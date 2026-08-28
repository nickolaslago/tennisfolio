import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

/**
 * Label + control + inline error/hint slot shared by every form field,
 * mirroring `apps/web/src/components/data/entity-form.tsx`'s `FormField`.
 */
export function FieldWrapper({
  label,
  error,
  hint,
  optional,
  style,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[{ gap: spacing.one }, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {label}
          </Text>
          {optional ? (
            <Text style={[styles.optional, { color: colors.mutedForeground }]}>
              Optional
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {error ? (
        <Text style={[styles.message, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
  },
  message: {
    fontSize: 12,
  },
});
