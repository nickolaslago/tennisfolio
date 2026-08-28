import type { Club, Match } from '@tennisfolio/core';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ErrorState, LoadingState } from '@/components/data';
import { DeleteConfirmSheet, DetailHeader, RelatedMatches } from '@/components/entities';
import { useRepositories } from '@/hooks/use-repositories';
import { courtsSummary } from '@/lib/clubs-view';
import { useTheme } from '@/theme';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();
  const router = useRouter();
  const { repositories } = useRepositories();

  const [club, setClub] = useState<Club | null>(null);
  const [clubError, setClubError] = useState<string | null>(null);
  const [loadingClub, setLoadingClub] = useState(true);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadClub = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingClub(true);
    setClubError(null);
    repositories
      .getClub(id)
      .then(setClub)
      .catch((err: unknown) => setClubError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoadingClub(false));
  }, [repositories, id]);

  const loadMatches = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingMatches(true);
    setMatchesError(null);
    repositories
      .listMatches({ club_id: id, limit: 200 })
      .then((page) => setMatches(page.items))
      .catch((err: unknown) => setMatchesError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoadingMatches(false));
  }, [repositories, id]);

  useFocusEffect(
    useCallback(() => {
      loadClub();
      loadMatches();
    }, [loadClub, loadMatches]),
  );

  const handleDelete = async () => {
    if (!repositories || !club) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repositories.deleteClub(club.id);
      router.replace('/clubs');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingClub) return <LoadingState />;
  if (clubError || !club) {
    return <ErrorState message={clubError ?? undefined} onRetry={loadClub} />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { padding: spacing.four, gap: spacing.five }]}>
      <DetailHeader
        icon={club.icon}
        title={club.name}
        description={club.country}
        onEdit={() => router.push(`/clubs/${club.id}/edit`)}
        onDelete={() => setDeleteOpen(true)}
        fields={[
          { label: 'City', value: club.city ?? '—' },
          { label: 'Country', value: club.country ?? '—' },
          { label: 'Courts', value: courtsSummary(club.courts), fullWidth: true },
        ]}
      />

      <RelatedMatches
        matches={matches}
        isLoading={loadingMatches}
        isError={Boolean(matchesError)}
        errorMessage={matchesError ?? undefined}
        onRetry={loadMatches}
        heading="Matches at this club"
        emptyDescription="Matches played at this club will show up here."
        showSurfaceBreakdown
      />

      <DeleteConfirmSheet
        visible={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="Delete this club?"
        description="This permanently removes the club. This can't be undone."
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
