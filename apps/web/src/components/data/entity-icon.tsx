import { parseEntityIcon } from '@tennisfolio/core'

import { ENTITY_ICON_COLOR_CLASSES, ENTITY_ICON_COMPONENTS } from '@/lib/entity-icons'
import { cn } from '@/lib/utils'

/**
 * Decodes a stored `icon` value and renders the emoji or a tinted lucide
 * icon. Renders nothing when the value is unset (or malformed) — every call
 * site keeps its current layout exactly as if the entity had no icon.
 */
export function EntityIcon({
  value,
  className,
}: {
  value: string | null | undefined
  className?: string
}) {
  let parsed
  try {
    parsed = parseEntityIcon(value)
  } catch {
    return null
  }
  if (!parsed) return null

  if (parsed.kind === 'emoji') {
    return (
      <span className={cn('inline-block leading-none', className)} aria-hidden="true">
        {parsed.emoji}
      </span>
    )
  }

  const Icon = ENTITY_ICON_COMPONENTS[parsed.name]
  return (
    <Icon
      aria-hidden="true"
      className={cn('size-4 shrink-0', ENTITY_ICON_COLOR_CLASSES[parsed.color], className)}
    />
  )
}
