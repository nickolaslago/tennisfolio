import { Download, Home, MapPin, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'

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
  { labelKey: 'nav.export', to: '/export', icon: Download },
]
