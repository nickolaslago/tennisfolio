import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, PrimaryButton, TextField } from '@/components/form';
import { useTheme } from '@/theme';

import { EmptyState, ErrorState, LoadingState } from './query-state';
import { usePersistedViewMode, type ViewMode } from './use-persisted-view-mode';

export type { ViewMode } from './use-persisted-view-mode';

/** Every entity row needs a stable id for list keys and sort stability. */
export type EntityRow = { id: number | string };

export interface EntityColumn<T> {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
  /** Provide to make the column sortable; omit for display-only columns. */
  sortValue?: (item: T) => string | number | null | undefined;
  /** Relative width in compact/table view (`flex`). Defaults to `1`. */
  flex?: number;
  align?: 'left' | 'right';
}

export interface CreateAction {
  label: string;
  emptyLabel?: string;
  onPress: () => void;
}

export interface EntityListProps<T extends EntityRow> {
  /** Identity — drives the AsyncStorage key for the persisted view toggle. */
  entityKey: string;

  items: T[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;

  columns: EntityColumn<T>[];
  renderCard: (item: T) => ReactNode;

  /** Text each row is matched against. Omit to hide the filter input. */
  getSearchText?: (item: T) => string;
  searchPlaceholder?: string;

  emptyTitle: string;
  emptyDescription?: string;
  createAction?: CreateAction;

  defaultView?: ViewMode;
  defaultSort?: SortState;
}

type SortDirection = 'asc' | 'desc';
export interface SortState {
  columnId: string;
  direction: SortDirection;
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  // Nullish values always sort last, regardless of direction.
  const aEmpty = a === null || a === undefined;
  const bEmpty = b === null || b === undefined;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Config-driven entity list: cards by default with a toggle to a
 * compact/table layout (persisted per `entityKey`), text filtering, and
 * column-driven sorting — the mobile counterpart to
 * `apps/web/src/components/data/entity-list.tsx`.
 */
export function EntityList<T extends EntityRow>({
  entityKey,
  items,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  columns,
  renderCard,
  getSearchText,
  searchPlaceholder = 'Filter…',
  emptyTitle,
  emptyDescription,
  createAction,
  defaultView = 'card',
  defaultSort,
}: EntityListProps<T>) {
  const { colors, spacing } = useTheme();
  const [view, setView] = usePersistedViewMode(entityKey, defaultView);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const sortableColumns = useMemo(
    () => columns.filter((c) => c.sortValue),
    [columns],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !getSearchText) return items;
    return items.filter((item) =>
      getSearchText(item).toLowerCase().includes(q),
    );
  }, [items, query, getSearchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortValue) return filtered;
    const sortValue = column.sortValue;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort(
      (a, b) => factor * compareValues(sortValue(a), sortValue(b)),
    );
  }, [filtered, sort, columns]);

  const toggleSort = (columnId: string) => {
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: 'asc' };
      return {
        columnId,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
    setSortSheetOpen(false);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={errorMessage} onRetry={onRetry} />;

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={
          createAction
            ? (createAction.emptyLabel ?? createAction.label)
            : undefined
        }
        onAction={createAction?.onPress}
      />
    );
  }

  const toolbar = (
    <View
      style={[styles.toolbar, { gap: spacing.two, marginBottom: spacing.two }]}
    >
      {getSearchText ? (
        <TextField
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          accessibilityLabel={searchPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.searchField}
        />
      ) : null}

      <View style={[styles.toolbarRow, { gap: spacing.one }]}>
        {sortableColumns.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sort"
            onPress={() => setSortSheetOpen(true)}
            style={[styles.iconButton, { borderColor: colors.border }]}
          >
            <Feather name="sliders" size={16} color={colors.foreground} />
          </Pressable>
        ) : null}

        <View style={[styles.viewToggle, { borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Card view"
            accessibilityState={{ selected: view === 'card' }}
            onPress={() => setView('card')}
            style={[
              styles.viewToggleOption,
              view === 'card' && { backgroundColor: colors.muted },
            ]}
          >
            <Feather
              name="grid"
              size={16}
              color={
                view === 'card' ? colors.foreground : colors.mutedForeground
              }
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Table view"
            accessibilityState={{ selected: view === 'compact' }}
            onPress={() => setView('compact')}
            style={[
              styles.viewToggleOption,
              view === 'compact' && { backgroundColor: colors.muted },
            ]}
          >
            <Feather
              name="list"
              size={16}
              color={
                view === 'compact' ? colors.foreground : colors.mutedForeground
              }
            />
          </Pressable>
        </View>

        {createAction ? (
          <View style={styles.createButton}>
            <PrimaryButton
              label={createAction.label}
              onPress={createAction.onPress}
            />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {toolbar}

      {sorted.length === 0 ? (
        <Text style={[styles.noResults, { color: colors.mutedForeground }]}>
          No matches for “{query}”
        </Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.two }} />
          )}
          ListHeaderComponent={
            view === 'compact' ? (
              <View
                style={[styles.compactHeader, { borderColor: colors.border }]}
              >
                {columns.map((column) => (
                  <Pressable
                    key={column.id}
                    disabled={!column.sortValue}
                    onPress={() => column.sortValue && toggleSort(column.id)}
                    style={[styles.compactCell, { flex: column.flex ?? 1 }]}
                  >
                    <Text
                      style={[
                        styles.compactHeaderLabel,
                        {
                          color: colors.mutedForeground,
                          textAlign: column.align ?? 'left',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {column.header}
                      {sort?.columnId === column.id
                        ? sort.direction === 'asc'
                          ? ' ↑'
                          : ' ↓'
                        : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            view === 'card' ? (
              <View>{renderCard(item)}</View>
            ) : (
              <View style={styles.compactRow}>
                {columns.map((column) => (
                  <View
                    key={column.id}
                    style={[
                      styles.compactCell,
                      {
                        flex: column.flex ?? 1,
                        alignItems:
                          column.align === 'right' ? 'flex-end' : 'flex-start',
                      },
                    ]}
                  >
                    {column.cell(item)}
                  </View>
                ))}
              </View>
            )
          }
        />
      )}

      <BottomSheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title="Sort by"
      >
        {sortableColumns.map((column) => {
          const active = sort?.columnId === column.id;
          return (
            <Pressable
              key={column.id}
              accessibilityRole="button"
              onPress={() => toggleSort(column.id)}
              style={[styles.sortOption, { paddingVertical: spacing.two }]}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: active ? '700' : '400',
                }}
              >
                {column.header}
              </Text>
              {active ? (
                <Feather
                  name={sort?.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={colors.primary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'column',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchField: {
    marginBottom: 0,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewToggleOption: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    marginLeft: 'auto',
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 32,
  },
  compactHeader: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    marginBottom: 4,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCell: {
    paddingHorizontal: 4,
  },
  compactHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
