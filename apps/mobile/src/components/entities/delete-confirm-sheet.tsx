import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, PrimaryButton, SecondaryButton } from '@/components/form';
import { useTheme } from '@/theme';

export interface DeleteConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** Shown in place of `description` when a previous delete attempt failed, e.g. a 409 conflict. */
  error?: string | null;
  pending?: boolean;
  onConfirm: () => void;
}

/**
 * A `BottomSheet` confirming a delete before firing `onConfirm` — the mobile
 * counterpart of web's `ConfirmDeleteDialog`.
 */
export function DeleteConfirmSheet({
  visible,
  onClose,
  title,
  description,
  error,
  pending,
  onConfirm,
}: DeleteConfirmSheetProps) {
  const { colors, spacing } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <Text style={{ color: error ? colors.destructive : colors.mutedForeground }}>
        {error ?? description}
      </Text>
      <View style={[styles.actions, { gap: spacing.two }]}>
        <SecondaryButton label="Cancel" onPress={onClose} style={styles.button} />
        <PrimaryButton
          label="Delete"
          onPress={onConfirm}
          loading={pending}
          style={[styles.button, { backgroundColor: colors.destructive }]}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
  },
});
