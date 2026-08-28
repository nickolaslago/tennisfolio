import type { Opponent } from '@tennisfolio/core';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/data';
import { OpponentForm } from '@/components/entities/opponent-form';
import { useRepositories } from '@/hooks/use-repositories';

export default function EditOpponentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repositories } = useRepositories();

  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repositories || !id) return;
    repositories
      .getOpponent(id)
      .then(setOpponent)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [repositories, id]);

  if (loading) return <LoadingState />;
  if (error || !opponent) return <ErrorState message={error ?? undefined} />;

  return <OpponentForm mode="edit" opponent={opponent} />;
}
