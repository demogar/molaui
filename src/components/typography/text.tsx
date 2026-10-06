import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Running UI text in the system voice. Three inks and no more: ink for what
 * the reader came for, ink-2 for what explains it, muted for what they can
 * skip. A fourth grey would be a grey nobody can tell from its neighbours —
 * and muted is already the floor, at 4.83:1 on the shaded ground.
 *
 * `as` is limited to the three elements text actually lives in. A polymorphic
 * `as` that accepts anything is how a heading ends up styled as body text
 * with an `<h3>` underneath, and the outline lies.
 */
export const textVariants = cva('m-0 font-ui', {
  variants: {
    size: {
      xs: 'text-xs leading-snug',
      sm: 'text-sm leading-body',
      base: 'text-base leading-body',
      lg: 'text-lg leading-body',
    },
    tone: {
      /** Inherits the ground's ink, so the same Text reads on cloth and on a panel. */
      default: '',
      2: 'text-ink-2',
      muted: 'text-ink-muted',
      danger: 'text-ink-danger',
      success: 'text-ink-success',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    tabular: { true: 'tabular', false: '' },
    truncate: { true: 'truncate', false: '' },
  },
  defaultVariants: { size: 'base', tone: 'default', weight: 'regular', tabular: false, truncate: false },
})

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div'
}

export function Text({ as: Tag = 'p', size, tone, weight, tabular, truncate, className, ...props }: TextProps) {
  return <Tag className={cn(textVariants({ size, tone, weight, tabular, truncate }), className)} {...props} />
}
