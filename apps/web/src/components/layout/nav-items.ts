import { Home, MapPin, Settings, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  labelKey: string
  to: string
  icon: LucideIcon
  /** Match the path exactly instead of by prefix — needed so "/" isn't active everywhere. */
  end?: boolean
}

export const navItems: NavItem[] = [
  { labelKey: 'nav.home', to: '/', icon: Home, end: true },
  { labelKey: 'nav.matches', to: '/matches', icon: Swords },
  { labelKey: 'nav.opponents', to: '/opponents', icon: Users },
  { labelKey: 'nav.clubs', to: '/clubs', icon: MapPin },
  { labelKey: 'nav.tournaments', to: '/tournaments', icon: Trophy },
]

/**
 * Settings lives outside the main scrollable nav: pinned to the bottom of the
 * desktop sidebar, and reachable on mobile via a top-right icon on Home instead
 * of a bottom tab.
 */
export const settingsNavItem: NavItem = {
  labelKey: 'nav.settings',
  to: '/settings',
  icon: Settings,
}
