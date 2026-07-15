import { DetailPlaceholderPage, SectionPlaceholderPage } from '@/pages/placeholders'

export function ClubsPage() {
  return (
    <SectionPlaceholderPage
      title="Clubs"
      description="The clubs and courts where your matches happen."
      entity="club"
      basePath="/clubs"
    />
  )
}

export function ClubDetailPage() {
  return <DetailPlaceholderPage sectionTitle="Clubs" entity="club" basePath="/clubs" />
}
