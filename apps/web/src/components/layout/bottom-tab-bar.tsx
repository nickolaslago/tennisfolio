import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { navItems } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

/**
 * Mobile navigation: floating Liquid Glass pill above the bottom safe area,
 * hidden at the md breakpoint and up. The active tab's icon sits in a tinted
 * capsule that eases in, iOS-tab-bar style.
 */
export function BottomTabBar() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('nav.primaryNavLabel')}
      className="glass fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-full bg-sidebar text-sidebar-foreground shadow-lg ring-1 ring-sidebar-border md:hidden"
    >
      <ul
        className="grid px-2"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className="group flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[0.6875rem] font-medium outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:ring-inset"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300 ease-out motion-reduce:transition-none',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground group-hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon
                      aria-hidden="true"
                      className={cn(
                        'size-5 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:scale-100',
                        isActive && 'scale-110 stroke-[2.25]',
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      'transition-colors duration-300 motion-reduce:transition-none',
                      isActive ? 'text-sidebar-primary' : 'text-muted-foreground',
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
