import type { Club, Tournament } from '@tennisfolio/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntityIcon, EntityList, type EntityColumn } from '@/components/data';
import { useRepositories } from '@/hooks/use-repositories';
import { dateRange } from '@/lib/tournaments-view';
import { useTheme } from '@/theme';

export default function TournamentsListScreen() {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const { repositories } = useRepositories();

  const [items, setItems] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!repositories) return;
    setLoading(true);
    setError(null);
    Promise.all([repositories.listTournaments({ limit: 200 }), repositories.listClubs({ limit: 200 })])
      .then(([tournamentPage, clubPage]) => {
        setItems(tournamentPage.items);
        setClubs(clubPage.items);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const clubName = useMemo(() => {
    const byId = new Map(clubs.map((c) => [c.id, c.name]));
    return (clubId: string | null) => (clubId ? (byId.get(clubId) ?? null) : null);
  }, [clubs]);

  const goToDetail = (id: string) => router.push(`/tournaments/${id}`);

  const columns: EntityColumn<Tournament>[] = [
    {
      id: 'name',
      header: 'Name',
      flex: 2,
      sortValue: (t) => t.name.toLowerCase(),
      cell: (t) => (
        <Pressable accessibilityRole="link" onPress={() => goToDetail(t.id)} style={styles.nameCell}>
          <EntityIcon value={t.icon} size={15} />
          <Text style={[styles.nameCellLabel, { color: colors.primary }]} numberOfLines={1}>
            {t.name}
          </Text>
        </Pressable>
      ),
    },
    {
      id: 'season',
      header: 'Season',
      sortValue: (t) => t.season,
      cell: (t) => <Text style={{ color: colors.mutedForeground }}>{t.season ?? '—'}</Text>,
    },
    {
      id: 'tournament_type',
      header: 'Type',
      sortValue: (t) => t.tournament_type,
      cell: (t) => <Text style={{ color: colors.mutedForeground }}>{t.tournament_type}</Text>,
    },
    {
      id: 'organiser',
      header: 'Organiser',
      sortValue: (t) => t.organiser,
      cell: (t) => <Text style={{ color: colors.mutedForeground }}>{t.organiser ?? '—'}</Text>,
    },
    {
      id: 'club',
      header: 'Host club',
      sortValue: (t) => clubName(t.club_id),
      cell: (t) => <Text style={{ color: colors.mutedForeground }}>{clubName(t.club_id) ?? '—'}</Text>,
    },
    {
      id: 'dates',
      header: 'Dates',
      sortValue: (t) => t.start_date,
      cell: (t) => <Text style={{ color: colors.mutedForeground }}>{dateRange(t)}</Text>,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.container, { padding: spacing.four, gap: spacing.three }]}>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          Tournaments and leagues you&apos;ve entered, past and upcoming.
        </Text>
        <EntityList
          entityKey="tournaments"
          items={items}
          isLoading={loading}
          isError={Boolean(error)}
          errorMessage={error ?? undefined}
          onRetry={load}
          columns={columns}
          getSearchText={(t) =>
            `${t.name} ${t.season ?? ''} ${t.tournament_type} ${t.organiser ?? ''} ${clubName(t.club_id) ?? ''}`
          }
          searchPlaceholder="Filter tournaments…"
          defaultSort={{ columnId: 'name', direction: 'asc' }}
          emptyTitle="No tournaments yet"
          emptyDescription="Add the tournaments and leagues you've entered to start tracking matches by stage."
          createAction={{
            label: 'Add tournament',
            emptyLabel: 'Add your first tournament',
            onPress: () => router.push('/tournaments/new'),
          }}
          renderCard={(t) => (
            <Pressable onPress={() => goToDetail(t.id)}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <View style={[styles.cardTitleRow, { gap: spacing.one }]}>
                  <EntityIcon value={t.icon} size={18} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.name}</Text>
                </View>
                <View style={styles.cardGrid}>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Season</Text>
                    <Text style={{ color: colors.foreground }}>{t.season ?? '—'}</Text>
                  </View>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Type</Text>
                    <Text style={{ color: colors.foreground }}>{t.tournament_type}</Text>
                  </View>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Host club</Text>
                    <Text style={{ color: colors.foreground }}>{clubName(t.club_id) ?? '—'}</Text>
                  </View>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Dates</Text>
                    <Text style={{ color: colors.foreground }}>{dateRange(t)}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  description: {
    fontSize: 14,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameCellLabel: {
    fontWeight: '600',
    flexShrink: 1,
  },
  card: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardGridItem: {
    width: '50%',
    paddingVertical: 4,
  },
  cardLabel: {
    fontSize: 12,
  },
});
