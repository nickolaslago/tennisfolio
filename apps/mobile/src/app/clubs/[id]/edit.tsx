import type { Club } from '@tennisfolio/core';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/data';
import { ClubForm } from '@/components/entities/club-form';
import { useRepositories } from '@/hooks/use-repositories';

export default function EditClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repositories } = useRepositories();

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repositories || !id) return;
    repositories
      .getClub(id)
      .then(setClub)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [repositories, id]);

  if (loading) return <LoadingState />;
  if (error || !club) return <ErrorState message={error ?? undefined} />;

  return <ClubForm mode="edit" club={club} />;
}
