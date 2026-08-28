import type { Club, Match, StandingsRow, Tournament } from '@tennisfolio/core';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ErrorState, LoadingState } from '@/components/data';
import { DeleteConfirmSheet, DetailHeader, RelatedMatches, StandingsTable } from '@/components/entities';
import { useRepositories } from '@/hooks/use-repositories';
import { dateRange } from '@/lib/tournaments-view';
import { useTheme } from '@/theme';

function HostClubLink({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/clubs/${clubId}`)}>
      <Text style={{ color: colors.primary, fontWeight: '600' }}>{clubName}</Text>
    </Pressable>
  );
}

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();
  const router = useRouter();
  const { repositories } = useRepositories();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const [club, setClub] = useState<Club | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadTournament = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingTournament(true);
    setTournamentError(null);
    repositories
      .getTournament(id)
      .then((data) => {
        setTournament(data);
        if (data.club_id) {
          repositories.getClub(data.club_id).then(setClub).catch(() => setClub(null));
        } else {
          setClub(null);
        }
      })
      .catch((err: unknown) =>
        setTournamentError(err instanceof Error ? err.message : 'Something went wrong.'),
      )
      .finally(() => setLoadingTournament(false));
  }, [repositories, id]);

  const loadMatches = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingMatches(true);
    setMatchesError(null);
    repositories
      .listMatches({ tournament_id: id, limit: 200 })
      .then((page) => setMatches(page.items))
      .catch((err: unknown) => setMatchesError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoadingMatches(false));
  }, [repositories, id]);

  const loadStandings = useCallback(() => {
    if (!repositories || !id) return;
    setLoadingStandings(true);
    setStandingsError(null);
    repositories
      .getTournamentStandings(id)
      .then(setStandings)
      .catch((err: unknown) =>
        setStandingsError(err instanceof Error ? err.message : 'Something went wrong.'),
      )
      .finally(() => setLoadingStandings(false));
  }, [repositories, id]);

  useFocusEffect(
    useCallback(() => {
      loadTournament();
      loadMatches();
      loadStandings();
    }, [loadTournament, loadMatches, loadStandings]),
  );

  const handleDelete = async () => {
    if (!repositories || !tournament) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repositories.deleteTournament(tournament.id);
      router.replace('/tournaments');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingTournament) return <LoadingState />;
  if (tournamentError || !tournament) {
    return <ErrorState message={tournamentError ?? undefined} onRetry={loadTournament} />;
  }

  const isRankingLeague = tournament.tournament_type === 'Ranking League';
  const isKnockout = tournament.tournament_type === 'Knockout Tournament';

  return (
    <ScrollView contentContainerStyle={[styles.content, { padding: spacing.four, gap: spacing.five }]}>
      <DetailHeader
        icon={tournament.icon}
        title={tournament.name}
        description={tournament.season ?? tournament.tournament_type}
        onEdit={() => router.push(`/tournaments/${tournament.id}/edit`)}
        onDelete={() => setDeleteOpen(true)}
        fields={[
          { label: 'Season', value: tournament.season ?? '—' },
          { label: 'Type', value: tournament.tournament_type },
          { label: 'Format', value: tournament.format ?? '—' },
          { label: 'Organiser', value: tournament.organiser ?? '—' },
          {
            label: 'Host club',
            value:
              tournament.club_id && club ? (
                <HostClubLink clubId={tournament.club_id} clubName={club.name} />
              ) : (
                '—'
              ),
          },
          { label: 'Dates', value: dateRange(tournament) },
          { label: 'Notes', value: tournament.notes ?? '—', fullWidth: true },
        ]}
      />

      {isRankingLeague ? (
        <StandingsTable
          rows={standings}
          isLoading={loadingStandings}
          isError={Boolean(standingsError)}
          errorMessage={standingsError ?? undefined}
          onRetry={loadStandings}
        />
      ) : null}

      <RelatedMatches
        matches={matches}
        isLoading={loadingMatches}
        isError={Boolean(matchesError)}
        errorMessage={matchesError ?? undefined}
        onRetry={loadMatches}
        emptyDescription="Matches played in this tournament will show up here."
        groupByStage={isKnockout}
      />

      <DeleteConfirmSheet
        visible={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="Delete this tournament?"
        description="This permanently removes the tournament. This can't be undone."
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
