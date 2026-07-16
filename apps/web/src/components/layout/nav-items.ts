import { Download, Home, MapPin, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Match the path exactly instead of by prefix — needed so "/" isn't active everywhere. */
  end?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Matches', to: '/matches', icon: Swords },
  { label: 'Opponents', to: '/opponents', icon: Users },
  { label: 'Clubs', to: '/clubs', icon: MapPin },
  { label: 'Tournaments', to: '/tournaments', icon: Trophy },
  { label: 'Export', to: '/export', icon: Download },
]
