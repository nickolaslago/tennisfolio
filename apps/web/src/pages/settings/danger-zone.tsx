import { Trash2, TriangleAlert } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/glass/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/glass/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteAllData } from '@/lib/api/data-reset'
import { queryClient } from '@/lib/api/query-client'
import { SettingsSection } from '@/pages/settings/settings-section'

const CONFIRM_PHRASE = 'delete Tennisfolio'

export function DangerZoneSettingsPage() {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const resetConfirmText = () => setConfirmText('')

  const handleConfirmTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConfirmText(event.target.value)
  }

  const handleConfirm = async () => {
    setConfirmOpen(false)
    setPending(true)
    setError(null)
    setDone(false)
    try {
      await deleteAllData()
      queryClient.clear()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dangerZone.deleteAllData.failed'))
    } finally {
      setPending(false)
      resetConfirmText()
    }
  }

  return (
    <SettingsSection
      title={t('settings.dangerZone.title')}
      description={t('settings.dangerZone.description')}
    >
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-4" />
            {t('dangerZone.deleteAllData.title')}
          </CardTitle>
          <CardDescription>{t('dangerZone.deleteAllData.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          {done ? (
            <div
              role="status"
              className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
            >
              {t('dangerZone.deleteAllData.successMessage')}
            </div>
          ) : null}

          <div>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 aria-hidden="true" data-icon="inline-start" />
              {pending ? t('dangerZone.deleteAllData.pending') : t('dangerZone.deleteAllData.button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) resetConfirmText()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dangerZone.deleteAllData.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dangerZone.deleteAllData.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="danger-zone-confirm-input">
              {t('dangerZone.deleteAllData.confirmInputLabel', { phrase: CONFIRM_PHRASE })}
            </Label>
            <Input
              id="danger-zone-confirm-input"
              value={confirmText}
              onChange={handleConfirmTextChange}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== CONFIRM_PHRASE}
              onClick={() => void handleConfirm()}
            >
              {t('dangerZone.deleteAllData.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  )
}
