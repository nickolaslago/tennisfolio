import * as React from 'react'

import {
  Select,
  SelectContent as BaseSelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** SelectContent with the Liquid Glass surface treatment. See glass/card.tsx. */
function SelectContent({ className, ...props }: React.ComponentProps<typeof BaseSelectContent>) {
  return <BaseSelectContent className={cn('glass ring-glass-border', className)} {...props} />
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
