import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type PlaceholderScreenProps = ViewProps & {
  title: string;
  subtitle?: string;
};

/**
 * Shared scaffold for the tab placeholder screens. Real screens land in DAT-98;
 * for now every tab renders a centered title so the navigation skeleton is
 * navigable end to end.
 */
export function PlaceholderScreen({ title, subtitle, children, ...rest }: PlaceholderScreenProps) {
  return (
    <ThemedView style={styles.container} {...rest}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
