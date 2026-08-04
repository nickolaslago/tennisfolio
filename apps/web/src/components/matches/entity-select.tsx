import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EntityIcon } from '@/components/data/entity-icon'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui-ext/searchable-select'

export interface EntitySelectOption {
  value: string
  label: string
  icon?: string | null
}

/**
 * Labeled searchable dropdown for picking one related entity, with an optional
 * adjacent "＋" button that opens an inline quick-create dialog (see the match
 * entry form). `value` is the selected id as a string, or `''` for nothing
 * selected.
 */
export function EntitySelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  noneLabel,
  onCreateNew,
  createLabel,
  autoFocus,
  ariaInvalid,
  ariaDescribedby,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  options: EntitySelectOption[]
  placeholder: string
  /** When set, renders a leading "clear selection" row that maps back to `''`. */
  noneLabel?: string
  onCreateNew?: () => void
  createLabel?: string
  autoFocus?: boolean
  ariaInvalid?: boolean
  ariaDescribedby?: string
}) {
  const { t } = useTranslation()
  const searchableOptions = useMemo(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        icon: <EntityIcon value={option.icon} />,
      })),
    [options],
  )

  return (
    <div className="flex items-center gap-2">
      <SearchableSelect
        id={id}
        className="flex-1"
        value={value}
        onValueChange={onValueChange}
        options={searchableOptions}
        placeholder={placeholder}
        noneLabel={noneLabel}
        autoFocus={autoFocus}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
      />
      {onCreateNew ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={createLabel ?? t('common.addNew')}
          title={createLabel ?? t('common.addNew')}
          onClick={onCreateNew}
        >
          <Plus aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
