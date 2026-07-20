import { Check } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A radiogroup of visual preference cards (theme thumbnails, font samples)
 * for the Appearance settings. Built on the Radix RadioGroup primitive, so
 * arrow-key navigation and roving focus work like any radio group — each
 * card is a `radio` item with its title below and a check on the active one.
 */
export function PreferenceCardGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid w-full max-w-md grid-cols-3 gap-3', className)}
      {...props}
    />
  )
}

export function PreferenceCard({
  value,
  title,
  className,
  children,
}: {
  value: string
  title: string
  /** Extra classes for the card frame (e.g. a fixed height for the preview). */
  className?: string
  children: ReactNode
}) {
  return (
    <RadioGroupPrimitive.Item value={value} className="group flex flex-col gap-1.5 outline-none">
      <span
        className={cn(
          'relative block overflow-hidden rounded-xl border-2 border-border transition-colors',
          'group-hover:border-muted-foreground/60',
          'group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
          'group-data-[state=checked]:border-primary',
          className,
        )}
      >
        {children}
        <RadioGroupPrimitive.Indicator asChild>
          <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check aria-hidden="true" className="size-3" />
          </span>
        </RadioGroupPrimitive.Indicator>
      </span>
      <span className="text-center text-sm font-medium text-muted-foreground transition-colors group-data-[state=checked]:text-foreground">
        {title}
      </span>
    </RadioGroupPrimitive.Item>
  )
}
