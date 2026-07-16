/**
 * Encode/decode logic for the `icon` field stored on opponents, clubs, and
 * tournaments: either `"emoji:<emoji>"` or `"icon:<lucide-name>:<color-token>"`.
 *
 * A mirror implementation lives in `apps/api/src/app/schemas/entity_icon.py`;
 * the curated name/token lists must stay identical on both sides.
 */

/** Curated lucide-react icon names available in the picker (kebab-case, matches lucide-react's own file names). */
export const ENTITY_ICON_NAMES = [
  'trophy',
  'award',
  'medal',
  'star',
  'crown',
  'flag',
  'target',
  'swords',
  'dumbbell',
  'gauge',
  'map-pin',
  'building-2',
  'landmark',
  'home',
  'globe',
  'compass',
  'mountain',
  'tree-pine',
  'waves',
  'palmtree',
  'sun',
  'cloud-sun',
  'umbrella',
  'snowflake',
  'zap',
  'flame',
  'shield',
  'rocket',
  'sparkles',
  'users',
] as const

export type EntityIconName = (typeof ENTITY_ICON_NAMES)[number]

/** Color tokens map 1:1 to the `--rg-*`-derived semantic tokens in index.css (text-{token}). */
export const ENTITY_ICON_COLOR_TOKENS = [
  'primary',
  'secondary',
  'win',
  'loss',
  'highlight',
  'destructive',
  'muted-foreground',
] as const

export type EntityIconColorToken = (typeof ENTITY_ICON_COLOR_TOKENS)[number]

export type EntityIconValue =
  | { kind: 'emoji'; emoji: string }
  | { kind: 'icon'; name: EntityIconName; color: EntityIconColorToken }

const ICON_NAME_SET: ReadonlySet<string> = new Set(ENTITY_ICON_NAMES)
const COLOR_TOKEN_SET: ReadonlySet<string> = new Set(ENTITY_ICON_COLOR_TOKENS)

export class InvalidEntityIconError extends Error {}

/**
 * Parse a stored `icon` string into a structured value. Returns `null` for a
 * nullish/empty input (the "no icon" state) and throws for a malformed one.
 */
export function parseEntityIcon(raw: string | null | undefined): EntityIconValue | null {
  if (raw === null || raw === undefined || raw === '') return null

  const emojiMatch = /^emoji:(.+)$/su.exec(raw)
  if (emojiMatch) {
    const emoji = emojiMatch[1]
    if (!emoji || /\s/u.test(emoji) || [...emoji].length > 8) {
      throw new InvalidEntityIconError(`Invalid emoji icon encoding: "${raw}"`)
    }
    return { kind: 'emoji', emoji }
  }

  const iconMatch = /^icon:([a-z0-9-]+):([a-z-]+)$/.exec(raw)
  if (iconMatch) {
    const [, name, color] = iconMatch
    if (!ICON_NAME_SET.has(name) || !COLOR_TOKEN_SET.has(color)) {
      throw new InvalidEntityIconError(`Invalid icon encoding: "${raw}"`)
    }
    return { kind: 'icon', name: name as EntityIconName, color: color as EntityIconColorToken }
  }

  throw new InvalidEntityIconError(`Invalid icon encoding: "${raw}"`)
}

export function formatEntityIcon(value: EntityIconValue): string {
  return value.kind === 'emoji' ? `emoji:${value.emoji}` : `icon:${value.name}:${value.color}`
}

/** Returns whether a raw `icon` string is well-formed, without throwing. */
export function isValidEntityIcon(raw: string): boolean {
  try {
    parseEntityIcon(raw)
    return true
  } catch {
    return false
  }
}
