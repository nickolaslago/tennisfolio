import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface RowOptionsMenuProps {
  /** Identifies the row for the trigger's aria-label and the delete confirmation copy. */
  label: string
  /** Route to the page's existing edit flow. */
  editTo: string
  /** Route to the page's create form, prefilled via `duplicateState`. */
  duplicateTo: string
  duplicateState?: unknown
  onDelete: () => void
  deletePending?: boolean
  deleteDescription: string
}

export function RowOptionsMenu({
  label,
  editTo,
  duplicateTo,
  duplicateState,
  onDelete,
  deletePending,
  deleteDescription,
}: RowOptionsMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-36"
          onCloseAutoFocus={(event) => {
            // Let the alert dialog take focus instead of the dropdown restoring it to the trigger.
            if (confirmOpen) event.preventDefault()
          }}
        >
          <DropdownMenuItem asChild>
            <Link to={editTo}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={duplicateTo} state={duplicateState}>
              Duplicate
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={() => {
                onDelete()
                setConfirmOpen(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
