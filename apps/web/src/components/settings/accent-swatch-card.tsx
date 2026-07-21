import { PreferenceCard } from '@/components/settings/preference-card'
import type { Accent } from '@/hooks/use-accent'

/**
 * One accent option for the Appearance settings: two swatches previewing the
 * accent's primary colour (buttons, links) and its highlight/ring colour
 * (call-outs, focus). The colours are passed in as literal CSS values rather
 * than the live `--primary`/`--highlight` tokens, so every card shows its own
 * accent regardless of which one is currently active. `bg-background` keeps the
 * frame in step with the active light/dark theme.
 */
export function AccentSwatchCard({
  accent,
  title,
  primary,
  highlight,
}: {
  accent: Accent
  title: string
  primary: string
  highlight: string
}) {
  return (
    <PreferenceCard value={accent} title={title} className="h-20">
      <span className="flex h-full items-center justify-center gap-2 bg-background">
        <span
          aria-hidden="true"
          className="size-8 rounded-full ring-1 ring-black/10 ring-inset"
          style={{ backgroundColor: primary }}
        />
        <span
          aria-hidden="true"
          className="size-8 rounded-full ring-1 ring-black/10 ring-inset"
          style={{ backgroundColor: highlight }}
        />
      </span>
    </PreferenceCard>
  )
}
