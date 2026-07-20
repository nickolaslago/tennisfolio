import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { SettingsSectionMenu } from '@/pages/settings/settings-section-menu'
import { useDocumentTitle } from '@/lib/use-document-title'

/**
 * Shared frame for every settings route. The section menu is a persistent
 * left column on desktop (≥md) alongside the active section; on mobile it's
 * hidden here since each section is its own full-width screen — the section
 * list only appears on the `/settings` index route (`SettingsIndexPage`).
 */
export function SettingsLayout() {
  const { t } = useTranslation()
  useDocumentTitle(t('settings.pageTitle'))

  return (
    <>
      <PageHeader title={t('settings.pageTitle')} description={t('settings.pageDescription')} />
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <SettingsSectionMenu className="hidden md:block md:w-72 md:shrink-0" />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </>
  )
}
