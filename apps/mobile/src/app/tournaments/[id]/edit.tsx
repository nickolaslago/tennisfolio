import type { Tournament } from '@tennisfolio/core';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/data';
import { TournamentForm } from '@/components/entities/tournament-form';
import { useRepositories } from '@/hooks/use-repositories';

export default function EditTournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repositories } = useRepositories();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repositories || !id) return;
    repositories
      .getTournament(id)
      .then(setTournament)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [repositories, id]);

  if (loading) return <LoadingState />;
  if (error || !tournament) return <ErrorState message={error ?? undefined} />;

  return <TournamentForm mode="edit" tournament={tournament} />;
}
