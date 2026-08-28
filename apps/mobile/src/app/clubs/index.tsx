import type { Club } from '@tennisfolio/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntityIcon, EntityList, type EntityColumn } from '@/components/data';
import { useRepositories } from '@/hooks/use-repositories';
import { courtsSummary } from '@/lib/clubs-view';
import { useTheme } from '@/theme';

export default function ClubsListScreen() {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const { repositories } = useRepositories();

  const [items, setItems] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!repositories) return;
    setLoading(true);
    setError(null);
    repositories
      .listClubs({ limit: 200 })
      .then((page) => setItems(page.items))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goToDetail = (id: string) => router.push(`/clubs/${id}`);

  const columns: EntityColumn<Club>[] = [
    {
      id: 'name',
      header: 'Name',
      flex: 2,
      sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => (
        <Pressable accessibilityRole="link" onPress={() => goToDetail(c.id)} style={styles.nameCell}>
          <EntityIcon value={c.icon} size={15} />
          <Text style={[styles.nameCellLabel, { color: colors.primary }]} numberOfLines={1}>
            {c.name}
          </Text>
        </Pressable>
      ),
    },
    {
      id: 'city',
      header: 'City',
      sortValue: (c) => c.city,
      cell: (c) => <Text style={{ color: colors.mutedForeground }}>{c.city ?? '—'}</Text>,
    },
    {
      id: 'country',
      header: 'Country',
      sortValue: (c) => c.country,
      cell: (c) => <Text style={{ color: colors.mutedForeground }}>{c.country ?? '—'}</Text>,
    },
    {
      id: 'courts',
      header: 'Courts',
      sortValue: (c) => c.courts.length,
      cell: (c) => (
        <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
          {courtsSummary(c.courts)}
        </Text>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.container, { padding: spacing.four, gap: spacing.three }]}>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          The clubs and courts where your matches happen.
        </Text>
        <EntityList
          entityKey="clubs"
          items={items}
          isLoading={loading}
          isError={Boolean(error)}
          errorMessage={error ?? undefined}
          onRetry={load}
          columns={columns}
          getSearchText={(c) =>
            `${c.name} ${c.city ?? ''} ${c.country ?? ''} ${c.courts
              .map((court) => `${court.surface} ${court.environment}`)
              .join(' ')}`
          }
          searchPlaceholder="Filter clubs…"
          defaultSort={{ columnId: 'name', direction: 'asc' }}
          emptyTitle="No clubs yet"
          emptyDescription="Add the clubs and courts where you play to start tracking records by venue."
          createAction={{
            label: 'Add club',
            emptyLabel: 'Add your first club',
            onPress: () => router.push('/clubs/new'),
          }}
          renderCard={(c) => (
            <Pressable onPress={() => goToDetail(c.id)}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <View style={[styles.cardTitleRow, { gap: spacing.one }]}>
                  <EntityIcon value={c.icon} size={18} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{c.name}</Text>
                </View>
                <View style={styles.cardGrid}>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>City</Text>
                    <Text style={{ color: colors.foreground }}>{c.city ?? '—'}</Text>
                  </View>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Country</Text>
                    <Text style={{ color: colors.foreground }}>{c.country ?? '—'}</Text>
                  </View>
                  <View style={[styles.cardGridItem, styles.cardGridItemFull]}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Courts</Text>
                    <Text style={{ color: colors.foreground }}>{courtsSummary(c.courts)}</Text>
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
  cardGridItemFull: {
    width: '100%',
  },
  cardLabel: {
    fontSize: 12,
  },
});
