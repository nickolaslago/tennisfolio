import { ChevronLeft, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState, ErrorState, LoadingState } from '@/components/data/query-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeleteOpponent, useOpponent, useOpponents } from '@/hooks/use-opponents'
import { useDocumentTitle } from '@/lib/use-document-title'

export function OpponentsPage() {
  useDocumentTitle('Opponents')
  const opponents = useOpponents()
  const deleteOpponent = useDeleteOpponent()

  return (
    <>
      <PageHeader
        title="Opponents"
        description="Players you've faced and your head-to-head records."
      />
      {opponents.isPending ? (
        <LoadingState />
      ) : opponents.isError ? (
        <ErrorState error={opponents.error} onRetry={() => void opponents.refetch()} />
      ) : opponents.data.items.length === 0 ? (
        <EmptyState title="No opponents yet" description="Opponents you add will show up here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Handedness</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {opponents.data.items.map((opponent) => (
                  <TableRow key={opponent.id}>
                    <TableCell>
                      <Link
                        to={`/opponents/${opponent.id}`}
                        className="font-medium hover:underline"
                      >
                        {opponent.name
                          ? `${opponent.name} ${opponent.last_name}`
                          : opponent.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{opponent.nationality ?? '—'}</TableCell>
                    <TableCell>{opponent.handedness ?? '—'}</TableCell>
                    <TableCell>{opponent.level ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${opponent.last_name}`}
                        disabled={deleteOpponent.isPending}
                        onClick={() => deleteOpponent.mutate(opponent.id)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
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
