import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/form';
import { useTheme } from '@/theme';

/** Shared loading/empty/error conventions for data-backed screens, mirroring `apps/web`'s `query-state.tsx`. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.center, { gap: spacing.two }]}>
      <ActivityIndicator color={colors.mutedForeground} />
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

export function ErrorState({
  message = "Couldn't load this",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.center, { gap: spacing.two }]}>
      <Feather name="alert-circle" size={22} color={colors.destructive} />
      <Text style={[styles.title, { color: colors.destructive }]}>
        {message}
      </Text>
      {onRetry ? <PrimaryButton label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.center,
        { gap: spacing.two, paddingVertical: spacing.five },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});
