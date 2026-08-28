import type { Opponent } from '@tennisfolio/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/data';
import { PrimaryButton, SecondaryButton, SelectField, TextField } from '@/components/form';
import {
  AGE_RANGE_OPTIONS,
  EMPTY_OPPONENT_FORM,
  HANDEDNESS_OPTIONS,
  isAgeRange,
  isHandedness,
  opponentFormToPayload,
  opponentToFormState,
  validateOpponentForm,
  type OpponentFormState,
} from '@/lib/opponents-view';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import { useRepositories } from '@/hooks/use-repositories';
import { RepositoryError } from '@/lib/repositories';
import { useTheme } from '@/theme';

export interface OpponentFormProps {
  mode: 'create' | 'edit';
  opponent?: Opponent;
}

/**
 * Create/edit form for an opponent — same fields and validation as
 * `apps/web/src/pages/opponents.tsx`'s `OpponentForm`, minus nationality's
 * search-as-you-type combobox and the icon picker (neither has a DAT-109
 * kit equivalent yet).
 */
export function OpponentForm({ mode, opponent }: OpponentFormProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { repositories, loading, error: reposError } = useRepositories();

  const [form, setForm] = useState<OpponentFormState>(() =>
    mode === 'edit' && opponent ? opponentToFormState(opponent) : EMPTY_OPPONENT_FORM,
  );
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = touched ? validateOpponentForm(form) : {};

  if (loading) return <LoadingState />;
  if (reposError || !repositories) {
    return <ErrorState message={reposError?.message} />;
  }

  const handleSubmit = async () => {
    setTouched(true);
    const clientErrors = validateOpponentForm(form);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = opponentFormToPayload(form);
      const saved =
        mode === 'edit' && opponent
          ? await repositories.updateOpponent(opponent.id, payload)
          : await repositories.createOpponent(payload);
      router.replace(`/opponents/${saved.id}`);
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
          label="First name"
          optional
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <TextField
          label="Last name"
          value={form.last_name}
          onChangeText={(last_name) => setForm({ ...form, last_name })}
          error={errors.last_name}
        />
        <SelectField
          label="Nationality"
          optional
          value={form.nationality || null}
          onChange={(nationality) => setForm({ ...form, nationality })}
          options={COUNTRY_OPTIONS}
          placeholder="Select nationality"
        />
        <TextField
          label="Level"
          optional
          value={form.level}
          onChangeText={(level) => setForm({ ...form, level })}
          placeholder="e.g. 4.5 NTRP, Club champion…"
        />
        <SelectField
          label="Handedness"
          optional
          value={form.handedness || null}
          onChange={(value) => setForm({ ...form, handedness: isHandedness(value) ? value : '' })}
          options={HANDEDNESS_OPTIONS}
          placeholder="Select handedness"
        />
        <SelectField
          label="Age range"
          optional
          value={form.age_range || null}
          onChange={(value) => setForm({ ...form, age_range: isAgeRange(value) ? value : '' })}
          options={AGE_RANGE_OPTIONS}
          placeholder="Select age range"
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
          label={mode === 'edit' ? 'Save changes' : 'Add opponent'}
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
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
});
