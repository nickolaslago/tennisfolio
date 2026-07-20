import { DatabaseBackup, Globe, Palette, type LucideIcon } from 'lucide-react'

export interface SettingsSectionItem {
  to: string
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
}

/**
 * Registry backing both the mobile section list (`/settings`) and the desktop
 * left-hand section menu. Add a new entry here to add a section — e.g. the
 * Danger zone (DAT-138) once it lands.
 */
export const settingsSectionItems: SettingsSectionItem[] = [
  {
    to: '/settings/general',
    icon: Globe,
    titleKey: 'settings.general.title',
    descriptionKey: 'settings.general.menuDescription',
  },
  {
    to: '/settings/appearance',
    icon: Palette,
    titleKey: 'settings.appearance.title',
    descriptionKey: 'settings.appearance.menuDescription',
  },
  {
    to: '/settings/backup',
    icon: DatabaseBackup,
    titleKey: 'settings.backupExport.title',
    descriptionKey: 'settings.backupExport.menuDescription',
  },
]
