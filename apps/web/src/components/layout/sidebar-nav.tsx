import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { navItems } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

/** Desktop navigation: fixed left sidebar, hidden below the md breakpoint. */
export function SidebarNav() {
  const { t } = useTranslation()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <span aria-hidden="true" className="text-xl">
          🎾
        </span>
        <span className="cn-font-heading text-lg font-semibold tracking-tight">Tennisfolio</span>
      </div>
      <nav aria-label={t('nav.primaryNavLabel')} className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )
                }
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
