import { DetailPlaceholderPage, SectionPlaceholderPage } from '@/pages/placeholders'

export function OpponentsPage() {
  return (
    <SectionPlaceholderPage
      title="Opponents"
      description="Players you've faced and your head-to-head records."
      entity="opponent"
      basePath="/opponents"
    />
  )
}

export function OpponentDetailPage() {
  return <DetailPlaceholderPage sectionTitle="Opponents" entity="opponent" basePath="/opponents" />
}
