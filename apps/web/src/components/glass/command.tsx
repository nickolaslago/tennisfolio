import * as React from 'react'

import {
  Command as BaseCommand,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

/**
 * Command with a transparent fill for use inside Liquid Glass popovers: the
 * vendored primitive paints its own bg-popover, which would stack a second
 * translucent layer over the already-frosted PopoverContent. See glass/card.tsx.
 */
function Command({ className, ...props }: React.ComponentProps<typeof BaseCommand>) {
  return <BaseCommand className={cn('bg-transparent', className)} {...props} />
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
