import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * A modal sheet anchored to the bottom of the screen, for quick-create flows
 * and other short-lived pickers (e.g. `SelectField`'s option list).
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingBottom: Math.max(insets.bottom, spacing.three),
            paddingHorizontal: spacing.three,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {title ? (
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
});
