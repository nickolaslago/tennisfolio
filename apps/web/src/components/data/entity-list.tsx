import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  LayoutGrid,
  Search,
  Table as TableIcon,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState, ErrorState, LoadingState } from '@/components/data/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePersistedView, type ViewMode } from '@/hooks/use-persisted-view'
import { cn } from '@/lib/utils'

type IconComponent = ComponentType<{ className?: string }>

/** Every entity row needs a stable id for React keys and sort stability. */
export type EntityRow = { id: number | string }

export interface EntityColumn<T> {
  id: string
  header: string
  cell: (item: T) => ReactNode
  /** Provide to make the column sortable; omit for display-only columns. */
  sortValue?: (item: T) => string | number | null | undefined
  /** Class for the body cell (`<td>`) — alignment/width. */
  className?: string
  /** Class for the header cell (`<th>`). */
  headClassName?: string
}

export interface CreateAction {
  /** Toolbar button label, e.g. "Add opponent". */
  label: string
  /** Empty-state CTA label, e.g. "Add your first opponent". Falls back to `label`. */
  emptyLabel?: string
  /** Router destination for the CTA. Use this or `onClick`. */
  to?: string
  onClick?: () => void
  icon?: IconComponent
}

export interface EntityListProps<T extends EntityRow> {
  /** Identity — drives the localStorage key for the persisted view toggle. */
  entityKey: string

  items: T[]
  isPending: boolean
  isError?: boolean
  error?: unknown
  onRetry?: () => void

  columns: EntityColumn<T>[]
  renderCard: (item: T) => ReactNode

  /**
   * Optional trailing action cell per row in table view (e.g. delete). Card view
   * composes its own actions inside `renderCard` — share a helper between the two.
   */
  rowActions?: (item: T) => ReactNode

  /** Text the filter matches against per row. Omit to hide the filter input. */
  getSearchText?: (item: T) => string
  searchPlaceholder?: string

  emptyTitle: string
  emptyDescription?: string
  createAction?: CreateAction

  defaultView?: ViewMode
  defaultSort?: { columnId: string; direction: SortDirection }
  /** Override the responsive grid used in card mode. */
  cardGridClassName?: string
}

type SortDirection = 'asc' | 'desc'
type SortState = { columnId: string; direction: SortDirection }

const DEFAULT_CARD_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  // Nullish values always sort last, regardless of direction.
  const aEmpty = a === null || a === undefined
  const bEmpty = b === null || b === undefined
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function CreateActionButton({ action, label }: { action: CreateAction; label: string }) {
  const Icon = action.icon
  const content = (
    <>
      {Icon ? <Icon data-icon="inline-start" /> : null}
      {label}
    </>
  )
  if (action.to) {
    return (
      <Button asChild size="sm">
        <Link to={action.to}>{content}</Link>
      </Button>
    )
  }
  return (
    <Button size="sm" onClick={action.onClick}>
      {content}
    </Button>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  const options: { value: ViewMode; label: string; icon: IconComponent }[] = [
    { value: 'table', label: 'Table view', icon: TableIcon },
    { value: 'card', label: 'Card view', icon: LayoutGrid },
  ]
  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex items-center gap-0.5 rounded-lg border border-input bg-transparent p-0.5 dark:bg-input/30"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="icon-sm"
          variant={view === value ? 'secondary' : 'ghost'}
          aria-label={label}
          aria-pressed={view === value}
          onClick={() => onChange(value)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  )
}

export function EntityList<T extends EntityRow>({
  entityKey,
  items,
  isPending,
  isError,
  error,
  onRetry,
  columns,
  renderCard,
  rowActions,
  getSearchText,
  searchPlaceholder = 'Filter…',
  emptyTitle,
  emptyDescription,
  createAction,
  defaultView = 'table',
  defaultSort,
  cardGridClassName,
}: EntityListProps<T>) {
  const [view, setView] = usePersistedView(entityKey, defaultView)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !getSearchText) return items
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q))
  }, [items, query, getSearchText])

  const sorted = useMemo(() => {
    if (view !== 'table' || !sort) return filtered
    const column = columns.find((c) => c.id === sort.columnId)
    if (!column?.sortValue) return filtered
    const sortValue = column.sortValue
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => factor * compareValues(sortValue(a), sortValue(b)))
  }, [filtered, sort, columns, view])

  const toggleSort = (columnId: string) => {
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: 'asc' }
      return { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  if (isPending) return <LoadingState />
  if (isError) return <ErrorState error={error} onRetry={onRetry} />

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          createAction ? (
            <CreateActionButton
              action={createAction}
              label={createAction.emptyLabel ?? createAction.label}
            />
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {getSearchText ? (
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-8"
            />
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {createAction ? (
            <CreateActionButton action={createAction} label={createAction.label} />
          ) : null}
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;.
        </p>
      ) : view === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => {
                    const active = sort?.columnId === column.id
                    const SortIcon = !active
                      ? ChevronsUpDown
                      : sort?.direction === 'asc'
                        ? ArrowUp
                        : ArrowDown
                    return (
                      <TableHead key={column.id} className={column.headClassName}>
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.id)}
                            aria-label={`Sort by ${column.header}`}
                            className={cn(
                              'group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                              active ? 'text-foreground' : 'text-foreground/70',
                            )}
                          >
                            {column.header}
                            <SortIcon
                              className={cn(
                                'size-3.5 shrink-0 transition-opacity',
                                active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    )
                  })}
                  {rowActions ? <TableHead className="w-px" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell(item)}
                      </TableCell>
                    ))}
                    {rowActions ? (
                      <TableCell className="text-right">{rowActions(item)}</TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(cardGridClassName ?? DEFAULT_CARD_GRID)}>
          {sorted.map((item) => (
            <div key={item.id}>{renderCard(item)}</div>
          ))}
        </div>
      )}
    </div>
  )
}
