import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The gap scale, named by role rather than by pixel. Every value is a spacing
 * multiple, so it scales with density: `md` is 12px comfortable, 10.5px
 * compact. Seven steps and no more — a layout that needs an eighth is a layout
 * that needs a divider, not another number.
 */
const GAP = {
  none: 'gap-0',
  '2xs': 'gap-1',
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-10',
} as const

export type Gap = keyof typeof GAP

export const stackVariants = cva('flex', {
  variants: {
    direction: { column: 'flex-col', row: 'flex-row' },
    gap: GAP,
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    wrap: { true: 'flex-wrap', false: '' },
  },
  defaultVariants: { direction: 'column', gap: 'md', wrap: false },
})

export interface StackProps extends React.ComponentProps<'div'>, VariantProps<typeof stackVariants> {}

/** Vertical rhythm: children down a column, one gap between them. */
export function Stack({ className, direction, gap, align, justify, wrap, ...props }: StackProps) {
  return <div className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)} {...props} />
}

export type InlineProps = Omit<StackProps, 'direction'>

/**
 * A row that wraps — toolbars, badge rows, button groups. Wraps by default,
 * because a row of controls that cannot wrap is the thing that forces a
 * 508px-wide document on a 390px phone (a real defect this system shipped).
 */
export function Inline({ className, gap = 'sm', align = 'center', wrap = true, justify, ...props }: InlineProps) {
  return (
    <div className={cn(stackVariants({ direction: 'row', gap, align, justify, wrap }), className)} {...props} />
  )
}

/** One thing on the left, one on the right: a panel header, a table toolbar. */
export function RowBetween({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex min-w-0 items-center justify-between gap-6', className)} {...props} />
}
