import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { maskIsoDate } from './date-mask';
import { FieldWrapper } from './field-wrapper';

export interface DateFieldProps {
  label: string;
  /** ISO date string (`YYYY-MM-DD`), or `null` when unset. */
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
}

/**
 * A `YYYY-MM-DD` date input matching the ISO date strings the API and
 * on-device schema store (see `@tennisfolio/core`'s `Match['match_date']`).
 * No native date-picker dependency — a masked text input keeps this a
 * primitive screens can wrap with a real calendar UI later.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  optional,
}: DateFieldProps) {
  const { colors, radii, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.destructive
    : focused
      ? colors.ring
      : colors.border;

  return (
    <FieldWrapper label={label} error={error} hint={hint} optional={optional}>
      <View
        style={[
          styles.container,
          {
            borderColor,
            borderRadius: radii.md,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.two,
          },
        ]}
      >
        <Feather name="calendar" size={16} color={colors.mutedForeground} />
        <TextInput
          value={value ?? ''}
          onChangeText={(text) => onChange(maskIsoDate(text))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          maxLength={10}
          style={[styles.input, { color: colors.foreground }]}
        />
      </View>
    </FieldWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
});
