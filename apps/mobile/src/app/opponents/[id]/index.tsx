import type { Match, Opponent } from '@tennisfolio/core';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ErrorState, LoadingState } from '@/components/data';
import { DeleteConfirmSheet, DetailHeader, RelatedMatches } from '@/components/entities';
import { useRepositories } from '@/hooks/use-repositories';
import { fullName } from '@/lib/opponents-view';
import { useTheme } from '@/theme';

export default function OpponentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();
  const router = useRouter();
  const { repositories } = useRepositories();

  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [opponentError, setOpponentError] = useState<string | null>(null);
  const [loadingOpponent, setLoadingOpponent] = useState(true);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadOpponent = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingOpponent(true);
    setOpponentError(null);
    repositories
      .getOpponent(id)
      .then(setOpponent)
      .catch((err: unknown) => setOpponentError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoadingOpponent(false));
  }, [repositories, id]);

  const loadMatches = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingMatches(true);
    setMatchesError(null);
    repositories
      .listMatches({ opponent_id: id, limit: 200 })
      .then((page) => setMatches(page.items))
      .catch((err: unknown) => setMatchesError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoadingMatches(false));
  }, [repositories, id]);

  useFocusEffect(
    useCallback(() => {
      loadOpponent();
      loadMatches();
    }, [loadOpponent, loadMatches]),
  );

  const handleDelete = async () => {
    if (!repositories || !opponent) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repositories.deleteOpponent(opponent.id);
      router.replace('/opponents');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingOpponent) return <LoadingState />;
  if (opponentError || !opponent) {
    return <ErrorState message={opponentError ?? undefined} onRetry={loadOpponent} />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { padding: spacing.four, gap: spacing.five }]}>
      <DetailHeader
        icon={opponent.icon}
        title={fullName(opponent)}
        description={opponent.level}
        onEdit={() => router.push(`/opponents/${opponent.id}/edit`)}
        onDelete={() => setDeleteOpen(true)}
        fields={[
          { label: 'Nationality', value: opponent.nationality ?? '—' },
          { label: 'Handedness', value: opponent.handedness ?? '—' },
          { label: 'Age range', value: opponent.age_range ?? '—' },
          { label: 'Notes', value: opponent.notes ?? '—' },
        ]}
      />

      <RelatedMatches
        matches={matches}
        isLoading={loadingMatches}
        isError={Boolean(matchesError)}
        errorMessage={matchesError ?? undefined}
        onRetry={loadMatches}
        emptyDescription="Matches played against this opponent will show up here."
      />

      <DeleteConfirmSheet
        visible={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="Delete this opponent?"
        description="This permanently removes the opponent. This can't be undone."
        error={deleteError}
        pending={deleting}
        onConfirm={() => void handleDelete()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
