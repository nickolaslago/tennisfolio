import * as React from 'react'

import {
  Dialog,
  DialogClose,
  DialogContent as BaseDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** DialogContent with the Liquid Glass surface treatment. See glass/card.tsx. */
function DialogContent({ className, ...props }: React.ComponentProps<typeof BaseDialogContent>) {
  return <BaseDialogContent className={cn('glass ring-glass-border', className)} {...props} />
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
