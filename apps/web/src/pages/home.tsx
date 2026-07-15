import { formatScore, parseScore } from '@tennisfolio/core'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/lib/use-document-title'

const sampleScore = formatScore(parseScore('6-4 3-6 10-7'))

export function HomePage() {
  useDocumentTitle('Home')

  return (
    <>
      <PageHeader
        title="Home"
        description="Your tennis portfolio at a glance — recent matches, form, and rivalries."
      />
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Tennisfolio 🎾</CardTitle>
          <CardDescription>
            Dashboard widgets land here in a later milestone. In the meantime, the score parser from{' '}
            <code>@tennisfolio/core</code> is wired up:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Sample score: <span className="font-medium text-win">{sampleScore}</span>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
