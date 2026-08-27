import { StyleSheet, View } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { summarizeMatch } from '@/lib/match-summary';

// Wiring proof: the derived result below comes entirely from the shared score
// parser in `@tennisfolio/core`, resolved through the pnpm workspace + Metro
// config. No scoring logic is re-implemented in the mobile app.
const SAMPLE_SCORE = '6-4 3-6 10-7';
const summary = summarizeMatch(SAMPLE_SCORE);

export default function MatchesScreen() {
  return (
    <PlaceholderScreen title="Matches" subtitle="Parsed by @tennisfolio/core">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="code" themeColor="textSecondary">
          {summary.input}
        </ThemedText>

        <View style={styles.resultRow}>
          <ThemedText type="subtitle">{summary.result}</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {summary.setsWon}–{summary.setsLost} sets
          </ThemedText>
        </View>

        <View style={styles.sets}>
          {summary.sets.map((set) => (
            <View key={set.setNo} style={styles.setRow}>
              <ThemedText type="smallBold">
                {set.gamesWon}-{set.gamesLost}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {set.result}
                {set.tiebreak ? ' · TB' : ''}
              </ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sets: {
    gap: Spacing.two,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
