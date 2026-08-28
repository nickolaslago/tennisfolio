import type { Club } from '@tennisfolio/core';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/data';
import { PrimaryButton, SecondaryButton, SelectField, TextField } from '@/components/form';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import {
  clubFormToPayload,
  clubToFormState,
  EMPTY_CLUB_FORM,
  EMPTY_COURT,
  ENVIRONMENT_OPTIONS,
  isEnvironment,
  isSurface,
  SURFACE_OPTIONS,
  validateClubForm,
  type ClubFormState,
  type CourtRow,
} from '@/lib/clubs-view';
import { useRepositories } from '@/hooks/use-repositories';
import { RepositoryError } from '@/lib/repositories';
import { useTheme } from '@/theme';

function CourtsEditor({
  courts,
  error,
  onChange,
}: {
  courts: CourtRow[];
  error?: string;
  onChange: (courts: CourtRow[]) => void;
}) {
  const { colors, spacing, radii } = useTheme();

  const update = (index: number, patch: Partial<CourtRow>) =>
    onChange(courts.map((court, i) => (i === index ? { ...court, ...patch } : court)));
  const add = () => onChange([...courts, { ...EMPTY_COURT }]);
  const remove = (index: number) => onChange(courts.filter((_, i) => i !== index));

  return (
    <View style={{ gap: spacing.two }}>
      <Text style={[styles.label, { color: colors.foreground }]}>Courts</Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Add at least one court. Each must be a unique surface and environment.
      </Text>

      <View style={{ gap: spacing.two }}>
        {courts.map((court, index) => (
          <View key={index} style={[styles.courtRow, { gap: spacing.one }]}>
            <View style={styles.courtField}>
              <SelectField
                label=""
                value={court.surface || null}
                onChange={(value) => update(index, { surface: isSurface(value) ? value : '' })}
                options={SURFACE_OPTIONS}
                placeholder="Select surface"
              />
            </View>
            <View style={styles.courtField}>
              <SelectField
                label=""
                value={court.environment || null}
                onChange={(value) => update(index, { environment: isEnvironment(value) ? value : '' })}
                options={ENVIRONMENT_OPTIONS}
                placeholder="Select environment"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove court"
              disabled={courts.length === 1}
              onPress={() => remove(index)}
              style={[
                styles.removeButton,
                { borderColor: colors.border, borderRadius: radii.md, opacity: courts.length === 1 ? 0.4 : 1 },
              ]}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        ))}
      </View>

      {error ? <Text style={{ color: colors.destructive, fontSize: 12 }}>{error}</Text> : null}

      <SecondaryButton label="Add court" onPress={add} style={styles.addButton} />
    </View>
  );
}

export interface ClubFormProps {
  mode: 'create' | 'edit';
  club?: Club;
}

/**
 * Create/edit form for a club, with its courts managed inline exactly as on
 * web (`ClubForm` + `CourtsEditor` in `apps/web/src/pages/clubs.tsx`), minus
 * the icon picker (no DAT-109 kit equivalent yet).
 */
export function ClubForm({ mode, club }: ClubFormProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { repositories, loading, error: reposError } = useRepositories();

  const [form, setForm] = useState<ClubFormState>(() =>
    mode === 'edit' && club ? clubToFormState(club) : EMPTY_CLUB_FORM,
  );
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = touched ? validateClubForm(form) : {};

  if (loading) return <LoadingState />;
  if (reposError || !repositories) {
    return <ErrorState message={reposError?.message} />;
  }

  const handleSubmit = async () => {
    setTouched(true);
    const clientErrors = validateClubForm(form);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = clubFormToPayload(form);
      const saved =
        mode === 'edit' && club
          ? await repositories.updateClub(club.id, payload)
          : await repositories.createClub(payload);
      router.replace(`/clubs/${saved.id}`);
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
          label="City"
          optional
          value={form.city}
          onChangeText={(city) => setForm({ ...form, city })}
        />
        <SelectField
          label="Country"
          optional
          value={form.country || null}
          onChange={(country) => setForm({ ...form, country })}
          options={COUNTRY_OPTIONS}
          placeholder="Select country"
        />
      </View>

      <CourtsEditor
        courts={form.courts}
        error={errors.courts}
        onChange={(courts) => setForm({ ...form, courts })}
      />

      <View style={[styles.actions, { gap: spacing.two }]}>
        <SecondaryButton label="Cancel" onPress={() => router.back()} style={styles.actionButton} />
        <PrimaryButton
          label={mode === 'edit' ? 'Save changes' : 'Add club'}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtField: {
    flex: 1,
  },
  removeButton: {
    height: 40,
    width: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
});
