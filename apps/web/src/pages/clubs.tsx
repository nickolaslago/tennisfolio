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
import { useClub, useClubs, useDeleteClub } from '@/hooks/use-clubs'
import { useDocumentTitle } from '@/lib/use-document-title'

export function ClubsPage() {
  useDocumentTitle('Clubs')
  const clubs = useClubs()
  const deleteClub = useDeleteClub()

  return (
    <>
      <PageHeader title="Clubs" description="The clubs and courts where your matches happen." />
      {clubs.isPending ? (
        <LoadingState />
      ) : clubs.isError ? (
        <ErrorState error={clubs.error} onRetry={() => void clubs.refetch()} />
      ) : clubs.data.items.length === 0 ? (
        <EmptyState title="No clubs yet" description="Clubs you add will show up here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Surface</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.data.items.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell>
                      <Link to={`/clubs/${club.id}`} className="font-medium hover:underline">
                        {club.name}
                      </Link>
                    </TableCell>
                    <TableCell>{club.city ?? '—'}</TableCell>
                    <TableCell>{club.surface ?? '—'}</TableCell>
                    <TableCell>{club.environment ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${club.name}`}
                        disabled={deleteClub.isPending}
                        onClick={() => deleteClub.mutate(club.id)}
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

export function ClubDetailPage() {
  const { id } = useParams()
  const clubId = Number(id)
  const club = useClub(clubId)
  useDocumentTitle(club.data ? club.data.name : 'Club')

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/clubs">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Back to Clubs
        </Link>
      </Button>

      {!Number.isFinite(clubId) ? (
        <ErrorState error={new Error(`"${id}" is not a valid club id.`)} />
      ) : club.isPending ? (
        <LoadingState />
      ) : club.isError ? (
        <ErrorState error={club.error} onRetry={() => void club.refetch()} />
      ) : (
        <>
          <PageHeader title={club.data.name} description={club.data.country ?? undefined} />
          <Card>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">City</dt>
                  <dd>{club.data.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Surface</dt>
                  <dd>{club.data.surface ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Environment</dt>
                  <dd>{club.data.environment ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
