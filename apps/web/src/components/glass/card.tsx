import * as React from 'react'

import {
  Card as BaseCard,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Card with the Liquid Glass surface treatment layered on shadcn's primitive:
 * the translucent fill comes from the re-pointed `--card` token, while `.glass`
 * adds the backdrop-blur + inner sheen and `ring-glass-border` softens the rim.
 * The vendored `src/components/ui/card` stays untouched — this only wraps it.
 */
function Card({ className, ...props }: React.ComponentProps<typeof BaseCard>) {
  return <BaseCard className={cn('glass ring-glass-border', className)} {...props} />
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
