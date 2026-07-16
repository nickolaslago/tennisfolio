import { EntityIcon } from '@/components/data/entity-icon'

interface PageHeaderProps {
  title: string
  description?: string
  /** Encoded entity icon (e.g. an opponent/club/tournament's `icon` field) shown beside the title. */
  icon?: string | null
}

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-1">
      <h1 className="flex items-center gap-2 cn-font-heading text-2xl font-semibold tracking-tight">
        <EntityIcon value={icon} className="size-6" />
        {title}
      </h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </header>
  )
}
