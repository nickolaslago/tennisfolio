import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme';

import type { ButtonProps } from './primary-button';

/** The secondary action button — outlined, using `colors.border` and `colors.foreground`. */
export function SecondaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: colors.border,
          borderRadius: radii.lg,
          paddingVertical: spacing.two,
          paddingHorizontal: spacing.three,
          backgroundColor: pressed ? colors.muted : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.foreground} />
      ) : (
        <Text style={[styles.label, { color: colors.foreground }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
