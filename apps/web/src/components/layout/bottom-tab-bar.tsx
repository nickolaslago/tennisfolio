import { NavLink } from 'react-router-dom'

import { navItems } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

/** Mobile navigation: fixed bottom tab bar, hidden at the md breakpoint and up. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-[0.6875rem] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:ring-inset',
                  isActive
                    ? 'text-sidebar-primary'
                    : 'text-muted-foreground hover:text-sidebar-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    aria-hidden="true"
                    className={cn('size-5', isActive && 'stroke-[2.25]')}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
