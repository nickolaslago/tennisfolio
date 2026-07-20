import { ChevronRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { settingsSectionItems } from '@/pages/settings/section-items'
import { cn } from '@/lib/utils'

/**
 * Section navigation shared by the mobile drill-down list (`/settings`) and
 * the desktop left-hand menu rendered beside the active section. Each row is
 * a real link so every section stays deep-linkable and back/forward work.
 */
export function SettingsSectionMenu({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('settings.sectionNavLabel')} className={className}>
      <ul className="flex flex-col gap-2">
        {settingsSectionItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'glass ring-glass-border flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'bg-card text-foreground hover:bg-accent/60',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
                      isActive && 'bg-primary text-primary-foreground',
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t(item.titleKey)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t(item.descriptionKey)}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
