import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { BottomSheet } from './bottom-sheet';
import { FieldWrapper } from './field-wrapper';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectFieldProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

/**
 * A tappable field that opens a `BottomSheet` listing `options` — the mobile
 * equivalent of the web app's `SearchableSelect`, without a native picker
 * dependency.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  hint,
  optional,
}: SelectFieldProps) {
  const { colors, radii, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <FieldWrapper label={label} error={error} hint={hint} optional={optional}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: radii.md,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.two,
          },
        ]}
      >
        <Text
          style={[
            styles.triggerLabel,
            { color: selected ? colors.foreground : colors.placeholder },
          ]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <FlatList
          data={options}
          keyExtractor={(option) => option.value}
          style={styles.list}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={[styles.option, { paddingVertical: spacing.two }]}
              >
                <Text
                  style={[styles.optionLabel, { color: colors.foreground }]}
                >
                  {item.label}
                </Text>
                {isSelected ? (
                  <Feather name="check" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </FieldWrapper>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerLabel: {
    fontSize: 16,
    flexShrink: 1,
  },
  list: {
    maxHeight: 360,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 16,
  },
});
