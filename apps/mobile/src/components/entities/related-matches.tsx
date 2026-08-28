import type { Match, Surface } from '@tennisfolio/core';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/data';
import { SecondaryButton } from '@/components/form';
import { useTheme } from '@/theme';

const SURFACES: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet'];
const KNOCKOUT_STAGE_ORDER = ['R16', 'QF', 'SF', 'F'];

type ResultFilter = 'all' | 'wins' | 'losses';

function matchResultLabel(match: Match): string {
  if (!match.result) return 'Scheduled';
  return match.result === 'Win' ? 'Win' : 'Loss';
}

export function record(matches: Match[]): { wins: number; losses: number } {
  return {
    wins: matches.filter((m) => m.result === 'Win').length,
    losses: matches.filter((m) => m.result === 'Loss').length,
  };
}

export interface SurfaceRecord {
  surface: Surface;
  wins: number;
  losses: number;
  total: number;
}

export function recordBySurface(matches: Match[]): SurfaceRecord[] {
  return SURFACES.map((surface) => {
    const surfaceMatches = matches.filter((m) => m.surface === surface);
    const { wins, losses } = record(surfaceMatches);
    return { surface, wins, losses, total: surfaceMatches.length };
  }).filter((row) => row.total > 0);
}

interface StageGroup {
  stage: string;
  matches: Match[];
}

export function groupByStage(matches: Match[]): StageGroup[] {
  const known = KNOCKOUT_STAGE_ORDER.filter((stage) =>
    matches.some((m) => m.stage === stage),
  ).map((stage) => ({ stage, matches: matches.filter((m) => m.stage === stage) }));
  const knownSet = new Set(KNOCKOUT_STAGE_ORDER);
  const otherStages = Array.from(
    new Set(
      matches
        .map((m) => m.stage)
        .filter((stage): stage is string => stage !== null && !knownSet.has(stage)),
    ),
  );
  const other = otherStages.map((stage) => ({
    stage,
    matches: matches.filter((m) => m.stage === stage),
  }));
  const unspecified = matches.filter((m) => !m.stage);
  return [
    ...known,
    ...other,
    ...(unspecified.length > 0 ? [{ stage: 'Unspecified', matches: unspecified }] : []),
  ];
}

function MatchRow({ match }: { match: Match }) {
  const { colors, spacing } = useTheme();
  const resultColor =
    match.result === 'Win' ? colors.win : match.result === 'Loss' ? colors.loss : colors.mutedForeground;

  return (
    <View style={[styles.row, { borderColor: colors.border, paddingVertical: spacing.two }]}>
      <Text style={[styles.cell, styles.dateCell, { color: colors.foreground }]}>
        {match.match_date}
      </Text>
      <Text style={[styles.cell, { color: colors.mutedForeground }]}>{match.score ?? '—'}</Text>
      <Text style={[styles.cell, { color: resultColor, fontWeight: '600' }]}>
        {matchResultLabel(match)}
      </Text>
      <Text style={[styles.cell, styles.surfaceCell, { color: colors.mutedForeground }]}>
        {match.surface ?? '—'}
      </Text>
    </View>
  );
}

function MatchesTable({ matches }: { matches: Match[] }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.table, { borderColor: colors.border, borderRadius: spacing.two }]}>
      <View style={[styles.row, styles.header, { borderColor: colors.border }]}>
        <Text style={[styles.cell, styles.dateCell, styles.headerLabel, { color: colors.mutedForeground }]}>
          Date
        </Text>
        <Text style={[styles.cell, styles.headerLabel, { color: colors.mutedForeground }]}>Score</Text>
        <Text style={[styles.cell, styles.headerLabel, { color: colors.mutedForeground }]}>Result</Text>
        <Text style={[styles.cell, styles.surfaceCell, styles.headerLabel, { color: colors.mutedForeground }]}>
          Surface
        </Text>
      </View>
      {matches.map((match) => (
        <MatchRow key={match.id} match={match} />
      ))}
    </View>
  );
}

export interface RelatedMatchesProps {
  matches: Match[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  heading?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Clubs: show a per-surface win/loss breakdown above the filter buttons. */
  showSurfaceBreakdown?: boolean;
  /** Knockout tournaments: group the match list by stage (R16/QF/SF/F, then others). */
  groupByStage?: boolean;
}

/**
 * The related-matches panel shown on an opponent/club/tournament detail
 * screen: overall win/loss record, an All/Wins/Losses filter, and the match
 * list — the mobile counterpart of `OpponentMatches` / `ClubMatches` /
 * `MatchesSection` on web, merged into one configurable component since the
 * three only differ in the optional surface breakdown and stage grouping.
 */
export function RelatedMatches({
  matches,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  heading = 'Matches',
  emptyTitle = 'No matches yet',
  emptyDescription,
  showSurfaceBreakdown = false,
  groupByStage: shouldGroupByStage = false,
}: RelatedMatchesProps) {
  const { colors, spacing } = useTheme();
  const [filter, setFilter] = useState<ResultFilter>('all');

  const { wins, losses } = useMemo(() => record(matches), [matches]);
  const surfaceRecords = useMemo(
    () => (showSurfaceBreakdown ? recordBySurface(matches) : []),
    [matches, showSurfaceBreakdown],
  );

  const filtered = useMemo(
    () =>
      matches.filter((match) => {
        if (filter === 'wins') return match.result === 'Win';
        if (filter === 'losses') return match.result === 'Loss';
        return true;
      }),
    [matches, filter],
  );

  const groups = shouldGroupByStage ? groupByStage(filtered) : null;

  return (
    <View style={{ gap: spacing.three }}>
      <View style={[styles.headingRow, { gap: spacing.two }]}>
        <Text style={[styles.heading, { color: colors.foreground }]}>{heading}</Text>
        {!isLoading && !isError ? (
          <Text style={{ color: colors.mutedForeground }}>
            {wins}–{losses} · {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : matches.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {surfaceRecords.length > 0 ? (
            <View style={[styles.surfaceGrid, { gap: spacing.two }]}>
              {surfaceRecords.map((row) => (
                <View
                  key={row.surface}
                  style={[styles.surfaceChip, { borderColor: colors.border, borderRadius: spacing.two }]}
                >
                  <Text style={[styles.surfaceChipLabel, { color: colors.mutedForeground }]}>
                    {row.surface}
                  </Text>
                  <Text style={[styles.surfaceChipValue, { color: colors.foreground }]}>
                    {row.wins}–{row.losses}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View
            accessibilityRole="tablist"
            style={[styles.filterRow, { gap: spacing.one }]}
          >
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'wins', label: 'Wins' },
                { value: 'losses', label: 'Losses' },
              ] as const
            ).map((option) => (
              <SecondaryButton
                key={option.value}
                label={option.label}
                onPress={() => setFilter(option.value)}
                style={
                  filter === option.value
                    ? { backgroundColor: colors.muted, borderColor: colors.primary }
                    : undefined
                }
              />
            ))}
          </View>

          {filtered.length === 0 ? (
            <Text style={[styles.noResults, { color: colors.mutedForeground }]}>
              No matches for this filter
            </Text>
          ) : groups ? (
            <View style={{ gap: spacing.four }}>
              {groups.map((group) => (
                <View key={group.stage} style={{ gap: spacing.two }}>
                  <Text style={[styles.stageLabel, { color: colors.mutedForeground }]}>
                    {group.stage}
                  </Text>
                  <MatchesTable matches={group.matches} />
                </View>
              ))}
            </View>
          ) : (
            <MatchesTable matches={filtered} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
  },
  surfaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  surfaceChip: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 76,
  },
  surfaceChipLabel: {
    fontSize: 11,
  },
  surfaceChipValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  stageLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  table: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 10,
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
  dateCell: {
    flex: 1.2,
  },
  surfaceCell: {
    flex: 0.8,
  },
});
