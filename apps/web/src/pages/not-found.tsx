import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/lib/use-document-title'

export function NotFoundPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('notFound.title'))

  return (
    <>
      <PageHeader title={t('notFound.title')} description={t('notFound.description')} />
      <Button asChild>
        <Link to="/">{t('notFound.backToHome')}</Link>
      </Button>
    </>
  )
}
