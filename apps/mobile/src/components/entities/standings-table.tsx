import type { StandingsRow } from '@tennisfolio/core';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/data';
import { useTheme } from '@/theme';

export interface StandingsTableProps {
  rows: StandingsRow[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}

/**
 * Ranking League standings, mobile counterpart of web's `StandingsTable` /
 * `StandingsSection`. Each opponent row routes to that opponent's detail
 * screen, same as the web table's opponent link.
 */
export function StandingsTable({
  rows,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: StandingsTableProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={{ gap: spacing.three }}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Standings</Text>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No standings yet"
          description="Play a match in this league to see the standings table."
        />
      ) : (
        <View style={[styles.table, { borderColor: colors.border, borderRadius: spacing.two }]}>
          <View style={[styles.row, styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.cell, styles.nameCell, styles.headerLabel, { color: colors.mutedForeground }]}>
              Opponent
            </Text>
            <Text style={[styles.cell, styles.headerLabel, { color: colors.mutedForeground }]}>W–L</Text>
            <Text style={[styles.cell, styles.headerLabel, { color: colors.mutedForeground }]}>Win %</Text>
            <Text style={[styles.cell, styles.headerLabel, { color: colors.mutedForeground }]}>Sets</Text>
            <Text style={[styles.cell, styles.headerLabel, { color: colors.mutedForeground }]}>Games</Text>
          </View>
          {rows.map((row) => (
            <Pressable
              key={row.opponent_id}
              accessibilityRole="button"
              onPress={() => router.push(`/opponents/${row.opponent_id}`)}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.cell, styles.nameCell, { color: colors.primary, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {row.opponent_name}
              </Text>
              <Text style={[styles.cell, { color: colors.foreground }]}>
                {row.wins}–{row.losses}
              </Text>
              <Text style={[styles.cell, { color: colors.foreground }]}>
                {row.win_rate === null ? '—' : `${Math.round(row.win_rate * 100)}%`}
              </Text>
              <Text style={[styles.cell, { color: colors.foreground }]}>
                {row.sets_won}–{row.sets_lost}
              </Text>
              <Text style={[styles.cell, { color: colors.foreground }]}>
                {row.games_won}–{row.games_lost}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 17,
    fontWeight: '700',
  },
  table: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingVertical: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cell: {
    flex: 1,
    fontSize: 13,
  },
  nameCell: {
    flex: 1.6,
  },
});
