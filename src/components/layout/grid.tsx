import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The responsive column patterns that recur. `auto` is the one a tool reaches
 * for most: as many columns of at least `minItem` as fit, which is what a grid
 * of stat tiles or agent cards actually wants — it never needs a breakpoint.
 */
export const gridVariants = cva('grid', {
  variants: {
    cols: {
      halves: 'grid-cols-1 md:grid-cols-2',
      thirds: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      quarters: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      fifths: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
      auto: 'grid-cols-[repeat(auto-fill,minmax(min(var(--grid-min,240px),100%),1fr))]',
    },
    gap: {
      tight: 'gap-3',
      default: 'gap-6',
      wide: 'gap-x-6 gap-y-8',
      /** Cells share keylines, like a table cut from one panel. */
      seamless: 'gap-[1.5px] bg-ink shadow-cut',
    },
  },
  defaultVariants: { cols: 'thirds', gap: 'default' },
})

export interface GridProps extends React.ComponentProps<'div'>, VariantProps<typeof gridVariants> {
  /** For `cols="auto"`: the narrowest a cell may get, as a CSS length. */
  minItem?: string
}

export function Grid({ className, cols, gap, minItem, style, ...props }: GridProps) {
  return (
    <div
      className={cn(gridVariants({ cols, gap }), className)}
      style={minItem ? ({ ...style, '--grid-min': minItem } as React.CSSProperties) : style}
      {...props}
    />
  )
}
