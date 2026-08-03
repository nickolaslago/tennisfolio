import type { ReactNode } from 'react'

import { Logo } from '@/components/brand/logo'
import { EntityIcon } from '@/components/data/entity-icon'

interface PageHeaderProps {
  title: string
  description?: string
  /** Encoded entity icon (e.g. an opponent/club/tournament's `icon` field) shown beside the title. */
  icon?: string | null
  /** Optional control rendered to the right of the title (e.g. a mobile-only shortcut). */
  action?: ReactNode
  /** Show the Tennisfolio logo instead of the title text on mobile (<md); desktop is unaffected. */
  logoOnMobile?: boolean
}

export function PageHeader({ title, description, icon, action, logoOnMobile }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        {logoOnMobile ? (
          <>
            <Logo className="h-8 w-auto md:hidden" />
            <h1 className="hidden items-center gap-2 font-heading text-2xl font-semibold tracking-tight md:flex">
              <EntityIcon value={icon} className="size-6" />
              {title}
            </h1>
          </>
        ) : (
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
            <EntityIcon value={icon} className="size-6" />
            {title}
          </h1>
        )}
        {action}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </header>
  )
}
