import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ENTITY_ICON_COLOR_TOKENS,
  ENTITY_ICON_NAMES,
  formatEntityIcon,
  type EntityIconColorToken,
  type EntityIconName,
} from '@tennisfolio/core';

import {
  EntityIcon,
  EntityList,
  type EntityColumn,
  type EntityRow,
} from '@/components/data';
import {
  BottomSheet,
  DateField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SelectField,
  TextField,
} from '@/components/form';
import { ThemeScope, useTheme, type ColorScheme } from '@/theme';

/**
 * Hidden route rendering every DAT-109 theme + component in both light and
 * dark mode as a living style guide — no navigation entry yet (kept off the
 * tab bar via `href: null` in `_layout.tsx`). Wire this into Settings once
 * that screen exists.
 */
export default function DevStyleGuideScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <StyleGuidePanel scheme="light" entityKeyPrefix="dev-style-guide-light" />
      <StyleGuidePanel scheme="dark" entityKeyPrefix="dev-style-guide-dark" />
    </ScrollView>
  );
}

function StyleGuidePanel({
  scheme,
  entityKeyPrefix,
}: {
  scheme: ColorScheme;
  entityKeyPrefix: string;
}) {
  return (
    <ThemeScope scheme={scheme}>
      <PanelBackground>
        <SafeAreaView edges={[]}>
          <Text style={styles.panelTitle}>
            {scheme === 'light' ? 'Light theme' : 'Dark theme'}
          </Text>

          <ColorSwatches />
          <Buttons />
          <FormFields />
          <BottomSheetDemo />
          <SectionHeaderDemo />
          <EntityIconGallery />
          <EntityListDemo entityKey={`${entityKeyPrefix}-opponents`} />
        </SafeAreaView>
      </PanelBackground>
    </ThemeScope>
  );
}

function PanelBackground({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.two, marginBottom: spacing.four }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ColorSwatches() {
  const { colors } = useTheme();
  const entries: [string, string][] = [
    ['background', colors.background],
    ['foreground', colors.foreground],
    ['primary', colors.primary],
    ['secondary', colors.secondary],
    ['muted', colors.muted],
    ['accent', colors.accent],
    ['destructive', colors.destructive],
    ['win', colors.win],
    ['loss', colors.loss],
    ['highlight', colors.highlight],
    ['border', colors.border],
  ];

  return (
    <Section title="Palette">
      <View style={styles.swatchGrid}>
        {entries.map(([name, color]) => (
          <View key={name} style={styles.swatchItem}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: color, borderColor: colors.border },
              ]}
            />
            <Text style={[styles.swatchLabel, { color: colors.foreground }]}>
              {name}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function Buttons() {
  const [count, setCount] = useState(0);

  return (
    <Section title="Buttons">
      <View style={styles.row}>
        <PrimaryButton
          label={`Primary (${count})`}
          onPress={() => setCount((n) => n + 1)}
        />
        <SecondaryButton label="Secondary" onPress={() => setCount(0)} />
      </View>
    </Section>
  );
}

function FormFields() {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);

  return (
    <Section title="Form primitives">
      <View style={{ gap: 12 }}>
        <TextField
          label="Opponent"
          value={text}
          onChangeText={setText}
          placeholder="Last name"
        />
        <TextField
          label="Notes"
          value=""
          onChangeText={() => {}}
          error="This field is required"
        />
        <SelectField
          label="Surface"
          value={selected}
          onChange={setSelected}
          options={[
            { label: 'Hard', value: 'Hard' },
            { label: 'Clay', value: 'Clay' },
            { label: 'Grass', value: 'Grass' },
            { label: 'Carpet', value: 'Carpet' },
          ]}
        />
        <DateField
          label="Match date"
          value={date}
          onChange={setDate}
          hint="YYYY-MM-DD"
        />
      </View>
    </Section>
  );
}

function BottomSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Section title="Bottom sheet">
      <SecondaryButton
        label="Open quick create"
        onPress={() => setOpen(true)}
      />
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Quick create"
      >
        <TextField
          label="Name"
          value=""
          onChangeText={() => {}}
          placeholder="e.g. Riverside Club"
        />
        <PrimaryButton label="Save" onPress={() => setOpen(false)} />
      </BottomSheet>
    </Section>
  );
}

function SectionHeaderDemo() {
  return (
    <Section title="Section header">
      <SectionHeader title="Recent matches" description="Last 5 results" />
    </Section>
  );
}

function EntityIconGallery() {
  const sampleNames = ENTITY_ICON_NAMES.slice(0, 8);

  return (
    <Section title="Entity icons">
      <View style={[styles.row, { gap: 16, flexWrap: 'wrap' }]}>
        <EntityIcon value="emoji:🎾" size={22} />
        {sampleNames.map((name: EntityIconName, index) => (
          <EntityIcon
            key={name}
            size={22}
            value={formatEntityIcon({
              kind: 'icon',
              name,
              color: ENTITY_ICON_COLOR_TOKENS[
                index % ENTITY_ICON_COLOR_TOKENS.length
              ] as EntityIconColorToken,
            })}
          />
        ))}
      </View>
    </Section>
  );
}

interface MockOpponent extends EntityRow {
  id: string;
  name: string;
  nationality: string;
  level: number;
  icon: string | null;
}

const MOCK_OPPONENTS: MockOpponent[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    nationality: 'Spain',
    level: 4.5,
    icon: formatEntityIcon({ kind: 'icon', name: 'swords', color: 'primary' }),
  },
  {
    id: '2',
    name: 'Jamie Cole',
    nationality: 'France',
    level: 3.5,
    icon: formatEntityIcon({ kind: 'icon', name: 'shield', color: 'win' }),
  },
  {
    id: '3',
    name: 'Priya Nair',
    nationality: 'India',
    level: 5.0,
    icon: 'emoji:🔥',
  },
  { id: '4', name: 'Theo Marks', nationality: 'USA', level: 2.5, icon: null },
];

function EntityListDemo({ entityKey }: { entityKey: string }) {
  const { colors } = useTheme();

  const columns: EntityColumn<MockOpponent>[] = [
    {
      id: 'name',
      header: 'Name',
      flex: 2,
      sortValue: (item) => item.name,
      cell: (item) => (
        <View style={[styles.row, { gap: 6, alignItems: 'center' }]}>
          <EntityIcon value={item.icon} size={16} />
          <Text style={{ color: colors.foreground }}>{item.name}</Text>
        </View>
      ),
    },
    {
      id: 'nationality',
      header: 'Country',
      sortValue: (item) => item.nationality,
      cell: (item) => (
        <Text style={{ color: colors.mutedForeground }}>
          {item.nationality}
        </Text>
      ),
    },
    {
      id: 'level',
      header: 'Level',
      align: 'right',
      sortValue: (item) => item.level,
      cell: (item) => (
        <Text style={{ color: colors.mutedForeground }}>
          {item.level.toFixed(1)}
        </Text>
      ),
    },
  ];

  return (
    <Section title="EntityList">
      <View style={{ height: 420 }}>
        <EntityList
          entityKey={entityKey}
          items={MOCK_OPPONENTS}
          columns={columns}
          getSearchText={(item) => `${item.name} ${item.nationality}`}
          searchPlaceholder="Filter opponents…"
          renderCard={(item) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.row, { gap: 8, alignItems: 'center' }]}>
                <EntityIcon value={item.icon} size={18} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {item.name}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground }}>
                {item.nationality} · Level {item.level.toFixed(1)}
              </Text>
            </View>
          )}
          emptyTitle="No opponents yet"
          emptyDescription="Add your first opponent to start tracking matches."
          createAction={{ label: 'Add opponent', onPress: () => {} }}
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
  },
  panel: {
    width: 420,
    padding: 20,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchItem: {
    alignItems: 'center',
    gap: 4,
    width: 72,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  swatchLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
