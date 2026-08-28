import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EntityIcon } from '@/components/data';
import { PrimaryButton, SecondaryButton } from '@/components/form';
import { useTheme } from '@/theme';

export interface DetailHeaderProps {
  icon?: string | null;
  title: string;
  description?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  deletePending?: boolean;
  /** Extra info rows rendered as a two-column grid beneath the title, e.g. nationality/handedness. */
  fields?: { label: string; value: ReactNode; fullWidth?: boolean }[];
}

/**
 * Icon + title + description + Edit/Delete actions, shared by the opponent,
 * club and tournament detail screens — the mobile counterpart of web's
 * `PageHeader` + edit/`ConfirmDeleteDialog` button row plus the `<dl>` info
 * card beneath it.
 */
export function DetailHeader({
  icon,
  title,
  description,
  onEdit,
  onDelete,
  deletePending,
  fields = [],
}: DetailHeaderProps) {
  const { colors, spacing, radii } = useTheme();

  return (
    <View style={{ gap: spacing.three }}>
      <View style={[styles.titleRow, { gap: spacing.two }]}>
        <View style={[styles.titleColumn, { gap: 2 }]}>
          <View style={[styles.titleLine, { gap: spacing.one }]}>
            <EntityIcon value={icon} size={22} />
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          </View>
          {description ? (
            <Text style={{ color: colors.mutedForeground }}>{description}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.actionsRow, { gap: spacing.two }]}>
        <SecondaryButton label="Edit" onPress={onEdit} />
        <PrimaryButton
          label="Delete"
          onPress={onDelete}
          loading={deletePending}
          style={{ backgroundColor: colors.destructive }}
        />
      </View>

      {fields.length > 0 ? (
        <View
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.card, borderRadius: radii.lg },
          ]}
        >
          <View style={styles.grid}>
            {fields.map((field) => (
              <View
                key={field.label}
                style={[styles.gridItem, field.fullWidth && styles.gridItemFull]}
              >
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  {field.label}
                </Text>
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>{field.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  card: {
    borderWidth: 1,
    padding: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    paddingVertical: 6,
    paddingRight: 8,
  },
  gridItemFull: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
});
