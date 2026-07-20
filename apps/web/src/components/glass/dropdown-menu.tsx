import * as React from 'react'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent as BaseDropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent as BaseDropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/** DropdownMenuContent with the Liquid Glass surface treatment. See glass/card.tsx. */
function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseDropdownMenuContent>) {
  return <BaseDropdownMenuContent className={cn('glass ring-glass-border', className)} {...props} />
}

/** Submenu surface — glassed to match the parent menu. */
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseDropdownMenuSubContent>) {
  return (
    <BaseDropdownMenuSubContent className={cn('glass ring-glass-border', className)} {...props} />
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
