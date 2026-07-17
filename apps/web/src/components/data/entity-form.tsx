import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

/** Labeled field wrapper shared by every entity create/edit form — label, control, error/hint. */
export function FormField({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground">{t('common.optional')}</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** Top-level banner for submit errors that aren't tied to a single field (network, 409s, etc.). */
export function FormBanner({ error }: { error: unknown }) {
  const { t } = useTranslation()
  if (!error) return null
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : t('common.somethingWentWrong')

  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  )
}
