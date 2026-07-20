import { Navigate } from 'react-router-dom'

import { useMediaQuery } from '@/hooks/use-media-query'
import { SettingsSectionMenu } from '@/pages/settings/settings-section-menu'

/**
 * `/settings` itself. On desktop the section menu is always visible in
 * `SettingsLayout`, so landing here just redirects into the first section.
 * On mobile — where that menu is hidden — this renders the section list
 * instead, matching the "menu of sections" drill-down from the Wealthfolio
 * reference.
 */
export function SettingsIndexPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return <Navigate to="/settings/general" replace />
  }

  return <SettingsSectionMenu />
}
