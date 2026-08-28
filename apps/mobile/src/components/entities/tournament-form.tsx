import type { Club, Tournament } from '@tennisfolio/core';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/data';
import { DateField, PrimaryButton, SecondaryButton, SelectField, TextField } from '@/components/form';
import { useRepositories } from '@/hooks/use-repositories';
import { RepositoryError } from '@/lib/repositories';
import {
  CUSTOM_FORMAT_VALUE,
  EMPTY_TOURNAMENT_FORM,
  FORMAT_OPTIONS,
  isTournamentType,
  startsAsCustomFormat,
  TOURNAMENT_TYPE_OPTIONS,
  tournamentFormToPayload,
  tournamentToFormState,
  validateTournamentForm,
  type TournamentFormState,
} from '@/lib/tournaments-view';
import { useTheme } from '@/theme';

const NO_HOST_CLUB = '';

export interface TournamentFormProps {
  mode: 'create' | 'edit';
  tournament?: Tournament;
}

/**
 * Create/edit form for a tournament — same fields and validation as
 * `apps/web/src/pages/tournaments.tsx`'s `TournamentForm`, minus the icon
 * picker (no DAT-109 kit equivalent yet).
 */
export function TournamentForm({ mode, tournament }: TournamentFormProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { repositories, loading, error: reposError } = useRepositories();

  const [clubs, setClubs] = useState<Club[]>([]);
  useEffect(() => {
    if (!repositories) return;
    repositories
      .listClubs({ limit: 200 })
      .then((page) => setClubs(page.items))
      .catch(() => setClubs([]));
  }, [repositories]);

  const [form, setForm] = useState<TournamentFormState>(() =>
    mode === 'edit' && tournament ? tournamentToFormState(tournament) : EMPTY_TOURNAMENT_FORM,
  );
  const [customFormat, setCustomFormat] = useState(() => startsAsCustomFormat(form.format));
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = touched ? validateTournamentForm(form) : {};

  if (loading) return <LoadingState />;
  if (reposError || !repositories) {
    return <ErrorState message={reposError?.message} />;
  }

  const clubOptions = [
    { value: NO_HOST_CLUB, label: 'No host club' },
    ...[...clubs].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleSubmit = async () => {
    setTouched(true);
    const clientErrors = validateTournamentForm(form);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = tournamentFormToPayload(form);
      const saved =
        mode === 'edit' && tournament
          ? await repositories.updateTournament(tournament.id, payload)
          : await repositories.createTournament(payload);
      router.replace(`/tournaments/${saved.id}`);
    } catch (err) {
      setSubmitError(err instanceof RepositoryError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { gap: spacing.three, padding: spacing.four }]}>
      {submitError ? (
        <View
          style={[
            styles.banner,
            { borderColor: colors.destructive, backgroundColor: colors.destructive + '1a' },
          ]}
        >
          <Text style={{ color: colors.destructive }}>{submitError}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        <TextField
          label="Name"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
          error={errors.name}
        />
        <TextField
          label="Season"
          optional
          value={form.season}
          onChangeText={(season) => setForm({ ...form, season })}
          placeholder="e.g. 2026"
        />
        <SelectField
          label="Tournament type"
          value={form.tournament_type || null}
          onChange={(value) =>
            setForm({ ...form, tournament_type: isTournamentType(value) ? value : '' })
          }
          options={TOURNAMENT_TYPE_OPTIONS}
          placeholder="Select tournament type"
          error={errors.tournament_type}
        />

        <View>
          <SelectField
            label="Format"
            optional
            value={customFormat ? CUSTOM_FORMAT_VALUE : form.format || null}
            onChange={(value) => {
              if (value === CUSTOM_FORMAT_VALUE) {
                setCustomFormat(true);
                setForm({ ...form, format: '' });
              } else {
                setCustomFormat(false);
                setForm({ ...form, format: value });
              }
            }}
            options={FORMAT_OPTIONS}
            placeholder="Select format"
          />
          {customFormat ? (
            <TextField
              label=""
              value={form.format}
              onChangeText={(format) => setForm({ ...form, format })}
              placeholder="e.g. Round robin, then knockout"
              containerStyle={styles.customFormatField}
            />
          ) : null}
        </View>

        <TextField
          label="Organiser"
          optional
          value={form.organiser}
          onChangeText={(organiser) => setForm({ ...form, organiser })}
          placeholder="e.g. Riverside Tennis Club"
        />
        <SelectField
          label="Host club"
          optional
          value={form.club_id}
          onChange={(club_id) => setForm({ ...form, club_id })}
          options={clubOptions}
          placeholder="Select host club"
        />
        <DateField
          label="Start date"
          value={form.start_date || null}
          onChange={(start_date) => setForm({ ...form, start_date })}
        />
        <DateField
          label="End date"
          value={form.end_date || null}
          onChange={(end_date) => setForm({ ...form, end_date })}
          error={errors.end_date}
        />
      </View>

      <TextField
        label="Notes"
        optional
        value={form.notes}
        onChangeText={(notes) => setForm({ ...form, notes })}
        multiline
        numberOfLines={4}
      />

      <View style={[styles.actions, { gap: spacing.two }]}>
        <SecondaryButton label="Cancel" onPress={() => router.back()} style={styles.actionButton} />
        <PrimaryButton
          label={mode === 'edit' ? 'Save changes' : 'Add tournament'}
          onPress={() => void handleSubmit()}
          loading={submitting}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  grid: {
    gap: 16,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  customFormatField: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
});
