import { DetailPlaceholderPage, SectionPlaceholderPage } from '@/pages/placeholders'

export function TournamentsPage() {
  return (
    <SectionPlaceholderPage
      title="Tournaments"
      description="Tournaments and boxes you've entered, past and upcoming."
      entity="tournament"
      basePath="/tournaments"
    />
  )
}

export function TournamentDetailPage() {
  return (
    <DetailPlaceholderPage sectionTitle="Tournaments" entity="tournament" basePath="/tournaments" />
  )
}
