import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { FieldWrapper } from './field-wrapper';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Single-line text input with a label and inline error/hint slot. */
export function TextField({
  label,
  error,
  hint,
  optional,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors, radii, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.destructive
    : focused
      ? colors.ring
      : colors.border;

  return (
    <FieldWrapper
      label={label}
      error={error}
      hint={hint}
      optional={optional}
      style={containerStyle}
    >
      <TextInput
        placeholderTextColor={colors.placeholder}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            borderColor,
            borderRadius: radii.md,
            color: colors.foreground,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.two,
          },
        ]}
        {...rest}
      />
    </FieldWrapper>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    fontSize: 16,
  },
});
