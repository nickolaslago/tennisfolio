import { DetailPlaceholderPage, SectionPlaceholderPage } from '@/pages/placeholders'

export function MatchesPage() {
  return (
    <SectionPlaceholderPage
      title="Matches"
      description="Every match you've played, with scores and derived results."
      entity="match"
      basePath="/matches"
    />
  )
}

export function MatchDetailPage() {
  return <DetailPlaceholderPage sectionTitle="Matches" entity="match" basePath="/matches" />
}
