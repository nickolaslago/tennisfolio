import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/lib/use-document-title'

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

interface SectionProps {
  title: string
  description: string
  /** Singular noun for the section's records, e.g. "opponent". */
  entity: string
  basePath: string
}

/** Placeholder list page for a section, with sample deep links into its detail route. */
export function SectionPlaceholderPage({ title, description, entity, basePath }: SectionProps) {
  useDocumentTitle(title)

  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <CardTitle>Nothing here yet</CardTitle>
          <CardDescription>
            The {title.toLowerCase()} list lands in a later milestone. Detail pages are already
            deep-linkable — try a sample {entity}:
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[1, 2, 3].map((id) => (
            <Button key={id} variant="outline" size="sm" asChild>
              <Link to={`${basePath}/${id}`}>
                {capitalize(entity)} #{id}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

interface DetailProps {
  /** Plural section name for the back link, e.g. "Opponents". */
  sectionTitle: string
  entity: string
  basePath: string
}

/** Placeholder detail page for a single record, addressed by the `:id` route param. */
export function DetailPlaceholderPage({ sectionTitle, entity, basePath }: DetailProps) {
  const { id } = useParams()
  const title = `${capitalize(entity)} #${id}`
  useDocumentTitle(title)

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to={basePath}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Back to {sectionTitle}
        </Link>
      </Button>
      <PageHeader title={title} description={`Deep-linkable ${entity} detail route.`} />
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder — this page will show the {entity} with id{' '}
            <span className="font-medium text-foreground">{id}</span>.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
