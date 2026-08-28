import type { Opponent } from '@tennisfolio/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntityIcon, EntityList, type EntityColumn } from '@/components/data';
import { useRepositories } from '@/hooks/use-repositories';
import { fullName } from '@/lib/opponents-view';
import { useTheme } from '@/theme';

export default function OpponentsListScreen() {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const { repositories } = useRepositories();

  const [items, setItems] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!repositories) return;
    setLoading(true);
    setError(null);
    repositories
      .listOpponents({ limit: 200 })
      .then((page) => setItems(page.items))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goToDetail = (id: string) => router.push(`/opponents/${id}`);

  const columns: EntityColumn<Opponent>[] = [
    {
      id: 'name',
      header: 'Name',
      flex: 2,
      sortValue: (o) => fullName(o).toLowerCase(),
      cell: (o) => (
        <Pressable
          accessibilityRole="link"
          onPress={() => goToDetail(o.id)}
          style={styles.nameCell}
        >
          <EntityIcon value={o.icon} size={15} />
          <Text style={[styles.nameCellLabel, { color: colors.primary }]} numberOfLines={1}>
            {fullName(o)}
          </Text>
        </Pressable>
      ),
    },
    {
      id: 'nationality',
      header: 'Nationality',
      sortValue: (o) => o.nationality,
      cell: (o) => <Text style={{ color: colors.mutedForeground }}>{o.nationality ?? '—'}</Text>,
    },
    {
      id: 'handedness',
      header: 'Handedness',
      cell: (o) => <Text style={{ color: colors.mutedForeground }}>{o.handedness ?? '—'}</Text>,
    },
    {
      id: 'level',
      header: 'Level',
      sortValue: (o) => o.level,
      cell: (o) => <Text style={{ color: colors.mutedForeground }}>{o.level ?? '—'}</Text>,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.container, { padding: spacing.four, gap: spacing.three }]}>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          Players you&apos;ve faced and your head-to-head records.
        </Text>
        <EntityList
          entityKey="opponents"
          items={items}
          isLoading={loading}
          isError={Boolean(error)}
          errorMessage={error ?? undefined}
          onRetry={load}
          columns={columns}
          getSearchText={(o) => `${fullName(o)} ${o.nationality ?? ''} ${o.level ?? ''}`}
          searchPlaceholder="Filter opponents…"
          defaultSort={{ columnId: 'name', direction: 'asc' }}
          emptyTitle="No opponents yet"
          emptyDescription="Add the players you've faced to start tracking head-to-head records."
          createAction={{
            label: 'Add opponent',
            emptyLabel: 'Add your first opponent',
            onPress: () => router.push('/opponents/new'),
          }}
          renderCard={(o) => (
            <Pressable onPress={() => goToDetail(o.id)}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg },
                ]}
              >
                <View style={[styles.cardTitleRow, { gap: spacing.one }]}>
                  <EntityIcon value={o.icon} size={18} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{fullName(o)}</Text>
                </View>
                <View style={styles.cardGrid}>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Nationality</Text>
                    <Text style={{ color: colors.foreground }}>{o.nationality ?? '—'}</Text>
                  </View>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Handedness</Text>
                    <Text style={{ color: colors.foreground }}>{o.handedness ?? '—'}</Text>
                  </View>
                  <View style={styles.cardGridItem}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Level</Text>
                    <Text style={{ color: colors.foreground }}>{o.level ?? '—'}</Text>
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
