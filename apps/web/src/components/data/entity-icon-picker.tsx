import { formatEntityIcon, parseEntityIcon, type EntityIconColorToken } from '@tennisfolio/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ENTITY_ICON_COLOR_CLASSES,
  ENTITY_ICON_COLOR_LABELS,
  ENTITY_ICON_COLOR_SWATCH_CLASSES,
  ENTITY_ICON_COLOR_TOKENS,
  ENTITY_ICON_COMPONENTS,
  ENTITY_ICON_EMOJIS,
  ENTITY_ICON_LABELS,
  ENTITY_ICON_NAMES,
} from '@/lib/entity-icons'
import { cn } from '@/lib/utils'

const DEFAULT_COLOR: EntityIconColorToken = 'highlight'

/**
 * Dialog-based picker for the `icon` field — an emoji grid and a curated
 * lucide icon grid (with a color-token swatch row) as two tabs. `value` /
 * `onChange` carry the encoded string (or `null` for "no icon").
 */
export function EntityIconPicker({
  value,
  onChange,
  triggerLabel,
}: {
  value: string | null
  onChange: (value: string | null) => void
  triggerLabel?: string
}) {
  const { t } = useTranslation()
  const resolvedTriggerLabel = triggerLabel ?? t('common.iconPicker.chooseIcon')
  const [open, setOpen] = useState(false)
  let parsed
  try {
    parsed = parseEntityIcon(value)
  } catch {
    parsed = null
  }
  const [selectedColor, setSelectedColor] = useState<EntityIconColorToken>(
    parsed?.kind === 'icon' ? parsed.color : DEFAULT_COLOR,
  )

  const handleEmojiPick = (emoji: string) => {
    onChange(formatEntityIcon({ kind: 'emoji', emoji }))
    setOpen(false)
  }

  const handleIconPick = (name: (typeof ENTITY_ICON_NAMES)[number]) => {
    onChange(formatEntityIcon({ kind: 'icon', name, color: selectedColor }))
    setOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {parsed ? (
            parsed.kind === 'emoji' ? (
              <span aria-hidden="true">{parsed.emoji}</span>
            ) : (
              (() => {
                const Icon = ENTITY_ICON_COMPONENTS[parsed.name]
                return (
                  <Icon aria-hidden="true" className={ENTITY_ICON_COLOR_CLASSES[parsed.color]} />
                )
              })()
            )
          ) : null}
          {resolvedTriggerLabel}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-muted-foreground"
          >
            {t('common.clear')}
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.iconPicker.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('common.iconPicker.dialogDescription')}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="emoji">
            <TabsList className="w-full">
              <TabsTrigger value="emoji">{t('common.iconPicker.emojiTab')}</TabsTrigger>
              <TabsTrigger value="icon">{t('common.iconPicker.iconTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="emoji" className="mt-2">
              <div className="grid grid-cols-8 gap-1">
                {ENTITY_ICON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiPick(emoji)}
                    aria-label={emoji}
                    className="flex size-9 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="icon" className="mt-2 flex flex-col gap-3">
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t('common.iconPicker.iconColorLabel')}
              >
                {ENTITY_ICON_COLOR_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setSelectedColor(token)}
                    aria-label={ENTITY_ICON_COLOR_LABELS[token]}
                    aria-pressed={selectedColor === token}
                    className={cn(
                      'size-6 rounded-full ring-offset-2 ring-offset-popover transition-shadow',
                      ENTITY_ICON_COLOR_SWATCH_CLASSES[token],
                      selectedColor === token ? 'ring-2 ring-ring' : '',
                    )}
                  />
                ))}
              </div>

              <div className="grid grid-cols-6 gap-1">
                {ENTITY_ICON_NAMES.map((name) => {
                  const Icon = ENTITY_ICON_COMPONENTS[name]
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleIconPick(name)}
                      aria-label={ENTITY_ICON_LABELS[name]}
                      title={ENTITY_ICON_LABELS[name]}
                      className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <Icon className={ENTITY_ICON_COLOR_CLASSES[selectedColor]} />
                    </button>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
