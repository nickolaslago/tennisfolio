import { ChevronLeft, Trash2, UserPlus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { EntityList, type EntityColumn } from '@/components/data/entity-list'
import { ErrorState, LoadingState } from '@/components/data/query-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Opponent } from '@/lib/api/opponents'
import { useDeleteOpponent, useOpponent, useOpponents } from '@/hooks/use-opponents'
import { useDocumentTitle } from '@/lib/use-document-title'

const fullName = (opponent: Opponent) =>
  opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name

export function OpponentsPage() {
  useDocumentTitle('Opponents')
  const opponents = useOpponents()
  const deleteOpponent = useDeleteOpponent()

  const deleteButton = (opponent: Opponent) => (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Delete ${opponent.last_name}`}
      disabled={deleteOpponent.isPending}
      onClick={() => deleteOpponent.mutate(opponent.id)}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  )

  const columns: EntityColumn<Opponent>[] = [
    {
      id: 'name',
      header: 'Name',
      sortValue: (o) => fullName(o).toLowerCase(),
      cell: (o) => (
        <Link to={`/opponents/${o.id}`} className="font-medium hover:underline">
          {fullName(o)}
        </Link>
      ),
    },
    {
      id: 'nationality',
      header: 'Nationality',
      sortValue: (o) => o.nationality,
      cell: (o) => o.nationality ?? '—',
    },
    {
      id: 'handedness',
      header: 'Handedness',
      cell: (o) => o.handedness ?? '—',
    },
    {
      id: 'level',
      header: 'Level',
      sortValue: (o) => o.level,
      cell: (o) => o.level ?? '—',
    },
  ]

  return (
    <>
      <PageHeader
        title="Opponents"
        description="Players you've faced and your head-to-head records."
      />
      <EntityList
        entityKey="opponents"
        items={opponents.data?.items ?? []}
        isPending={opponents.isPending}
        isError={opponents.isError}
        error={opponents.error}
        onRetry={() => void opponents.refetch()}
        columns={columns}
        rowActions={deleteButton}
        getSearchText={(o) => `${fullName(o)} ${o.nationality ?? ''} ${o.level ?? ''}`}
        searchPlaceholder="Filter opponents…"
        defaultSort={{ columnId: 'name', direction: 'asc' }}
        emptyTitle="No opponents yet"
        emptyDescription="Add the players you've faced to start tracking head-to-head records."
        createAction={{
          label: 'Add opponent',
          emptyLabel: 'Add your first opponent',
          to: '/opponents/new',
          icon: UserPlus,
        }}
        renderCard={(o) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/opponents/${o.id}`}
                  className="cn-font-heading text-base font-medium hover:underline"
                >
                  {fullName(o)}
                </Link>
                {deleteButton(o)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Nationality</dt>
                  <dd>{o.nationality ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Handedness</dt>
                  <dd>{o.handedness ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Level</dt>
                  <dd>{o.level ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      />
    </>
  )
}

export function OpponentDetailPage() {
  const { id } = useParams()
  const opponentId = Number(id)
  const opponent = useOpponent(opponentId)
  useDocumentTitle(
    opponent.data ? `${opponent.data.name ?? ''} ${opponent.data.last_name}`.trim() : 'Opponent',
  )

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/opponents">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Back to Opponents
        </Link>
      </Button>

      {!Number.isFinite(opponentId) ? (
        <ErrorState error={new Error(`"${id}" is not a valid opponent id.`)} />
      ) : opponent.isPending ? (
        <LoadingState />
      ) : opponent.isError ? (
        <ErrorState error={opponent.error} onRetry={() => void opponent.refetch()} />
      ) : (
        <>
          <PageHeader
            title={
              opponent.data.name
                ? `${opponent.data.name} ${opponent.data.last_name}`
                : opponent.data.last_name
            }
            description={opponent.data.level ?? undefined}
          />
          <Card>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Nationality</dt>
                  <dd>{opponent.data.nationality ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Handedness</dt>
                  <dd>{opponent.data.handedness ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Age range</dt>
                  <dd>{opponent.data.age_range ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{opponent.data.notes ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
