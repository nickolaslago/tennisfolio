import { PreferenceCard } from '@/components/settings/preference-card'
import type { Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

/**
 * A miniature mock of the app UI — a heading, and list rows on raised cards —
 * built entirely from design-system tokens, so it renders in whichever theme
 * the `.light` / `.dark` scope around it re-points the tokens to.
 * Spans only: it lives inside a Radix radio item, which renders a <button>.
 */
function MockUi() {
  return (
    <span className="flex h-full min-w-24 flex-col gap-1 bg-background p-2">
      <span className="block h-1 w-9 rounded-full bg-foreground/70" />
      <span className="mb-0.5 block h-1 w-6 rounded-full bg-muted-foreground/50" />
      {[0, 1, 2].map((row) => (
        <span
          key={row}
          className="flex items-center gap-1 rounded-sm border border-border bg-card px-1 py-1"
        >
          <span className="block size-1.5 shrink-0 rounded-full bg-highlight" />
          <span className="block h-1 flex-1 rounded-full bg-muted-foreground/40" />
        </span>
      ))}
    </span>
  )
}

/**
 * One theme option for the Appearance settings: a preview thumbnail of the
 * app in that theme (System renders a light/dark split), title below, and
 * the PreferenceCard check + highlighted border when active.
 */
export function ThemePreviewCard({ theme, title }: { theme: Theme; title: string }) {
  return (
    <PreferenceCard value={theme} title={title} className="h-20">
      {theme === 'system' ? (
        <span className="flex h-full">
          <span className="light block h-full w-1/2 overflow-hidden">
            <MockUi />
          </span>
          <span className="dark block h-full w-1/2 overflow-hidden">
            <MockUi />
          </span>
        </span>
      ) : (
        <span className={cn('block h-full', theme)}>
          <MockUi />
        </span>
      )}
    </PreferenceCard>
  )
}
