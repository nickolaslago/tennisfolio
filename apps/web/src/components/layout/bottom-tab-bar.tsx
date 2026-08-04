import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { navItems } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

/**
 * Mobile navigation: floating Liquid Glass pill above the bottom safe area,
 * hidden at the md breakpoint and up. Slack-style tabs: each icon sits in a
 * fixed-size capsule (so the hover/active surface can never outgrow the bar,
 * whatever the label length) with the label underneath, truncated to its
 * column. The selected icon takes the accent colour while the capsule keeps
 * a constant translucency that is identical across accents.
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
          <li key={item.to} className="min-w-0">
            <NavLink
              to={item.to}
              end={item.end}
              className="group flex min-w-0 flex-col items-center gap-1 py-2 outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 focus-visible:ring-inset"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-300 ease-out motion-reduce:transition-none',
                      isActive
                        ? 'bg-foreground/10 text-primary'
                        : 'text-muted-foreground group-hover:bg-foreground/5 group-hover:text-sidebar-foreground',
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
                      'w-full truncate px-0.5 text-center text-[0.625rem] leading-tight font-medium transition-colors duration-300 ease-out motion-reduce:transition-none',
                      isActive
                        ? 'text-sidebar-foreground'
                        : 'text-muted-foreground group-hover:text-sidebar-foreground',
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
