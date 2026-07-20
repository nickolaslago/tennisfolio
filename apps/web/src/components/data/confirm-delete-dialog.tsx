import { Trash2 } from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/glass/alert-dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmDeleteDialogProps {
  title: string
  description: string
  onConfirm: () => void
  pending?: boolean
}

/** Destructive delete button that confirms via an AlertDialog before firing. For a detail view's primary delete action — list rows confirm via RowOptionsMenu instead. */
export function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  pending,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={pending}>
          <Trash2 aria-hidden="true" data-icon="inline-start" />
          {t('common.rowActions.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {t('common.rowActions.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
