import { MapPin, Plus, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/glass/dropdown-menu'

interface QuickCreateAction {
  labelKey: string
  to: string
  icon: LucideIcon
}

const quickCreateActions: QuickCreateAction[] = [
  { labelKey: 'nav.quickCreate.newMatch', to: '/matches/new', icon: Swords },
  { labelKey: 'nav.quickCreate.newOpponent', to: '/opponents/new', icon: Users },
  { labelKey: 'nav.quickCreate.newClub', to: '/clubs/new', icon: MapPin },
  { labelKey: 'nav.quickCreate.newTournament', to: '/tournaments/new', icon: Trophy },
]

/**
 * Floating "+" button pinned to the bottom-right corner just above the mobile
 * tab bar, Slack-style — home screen only, hidden at md and up where the
 * sidebar takes over. Opens a glass menu of the four create flows.
 */
export function QuickCreateFab() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  if (pathname !== '/') return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('nav.quickCreate.label')}
        className="group/quick-create fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-sidebar-border outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 md:hidden"
      >
        <Plus
          aria-hidden="true"
          className="size-6 transition-transform duration-300 ease-out group-data-[state=open]/quick-create:rotate-45 motion-reduce:transition-none"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-auto min-w-48">
        {quickCreateActions.map((action) => (
          <DropdownMenuItem key={action.to} asChild>
            <Link to={action.to}>
              <action.icon aria-hidden="true" />
              {t(action.labelKey)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
