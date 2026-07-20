import * as React from 'react'

import {
  Popover,
  PopoverAnchor,
  PopoverContent as BasePopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** PopoverContent with the Liquid Glass surface treatment. See glass/card.tsx. */
function PopoverContent({ className, ...props }: React.ComponentProps<typeof BasePopoverContent>) {
  return <BasePopoverContent className={cn('glass ring-glass-border', className)} {...props} />
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
