import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/lib/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <>
      <PageHeader
        title="Page not found"
        description="That ball went long — there's nothing at this address."
      />
      <Button asChild>
        <Link to="/">Back to Home</Link>
      </Button>
    </>
  )
}
