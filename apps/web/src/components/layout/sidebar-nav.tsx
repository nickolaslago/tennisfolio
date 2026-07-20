import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { navItems, settingsNavItem, type NavItem } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

function sidebarLinkClassName(isActive: boolean) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 active:scale-98 motion-reduce:transition-none motion-reduce:active:scale-100',
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  )
}

function SidebarNavLink({ item, label }: { item: NavItem; label: string }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => sidebarLinkClassName(isActive)}
    >
      <item.icon aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </NavLink>
  )
}

/**
 * Desktop navigation: floating Liquid Glass panel pinned to the left edge,
 * hidden below the md breakpoint. Fill comes from the glass-repointed
 * --sidebar token; `glass` adds the frost + sheen on top.
 */
export function SidebarNav() {
  const { t } = useTranslation()

  return (
    <aside className="glass fixed inset-y-3 left-3 z-40 hidden w-60 flex-col overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-lg ring-1 ring-sidebar-border md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <span aria-hidden="true" className="text-xl">
          🎾
        </span>
        <span className="font-heading text-lg font-semibold tracking-tight">Tennisfolio</span>
      </div>
      <nav aria-label={t('nav.primaryNavLabel')} className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <SidebarNavLink item={item} label={t(item.labelKey)} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <SidebarNavLink item={settingsNavItem} label={t(settingsNavItem.labelKey)} />
      </div>
    </aside>
  )
}
