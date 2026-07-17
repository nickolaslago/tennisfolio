import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { BottomTabBar } from '@/components/layout/bottom-tab-bar'
import { SidebarNav } from '@/components/layout/sidebar-nav'

/**
 * App shell: left sidebar on ≥md viewports, bottom tab bar below md.
 * Both navs are always mounted — visibility switches purely on viewport
 * width via responsive utilities, so no reload or JS is involved.
 */
export function AppShell() {
  const { t } = useTranslation()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        {t('nav.skipToContent')}
      </a>
      <SidebarNav />
      <div className="md:pl-60">
        <main
          id="main-content"
          className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 md:px-8 md:py-8"
        >
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
