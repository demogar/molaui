import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type Variants } from '../../lib/variants'

/**
 * The gap scale, named by role rather than by pixel. Every value is a spacing
 * multiple, so it scales with density: `md` is 16px comfortable, 14px
 * compact. Seven steps and no more — a layout that needs an eighth is a layout
 * that needs a divider, not another number.
 */
export type Gap = 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const GAP: Record<Gap, string> = {
  none: 'gap-0',
  '2xs': 'gap-1',
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-10',
}

export const stackVariants = cva('flex', {
  variants: {
    /** `column` (default) stacks children down; `row` lays them across without wrapping, unless `wrap` is set. */
    direction: { column: 'flex-col', row: 'flex-row' },
    /**
     * The space between children, on the role-named scale that moves with
     * density. Stack defaults to `md`, Inline to `sm`.
     */
    gap: GAP,
    /** Cross-axis alignment. Inline defaults to `center`, so an icon and a label line up; use `baseline` for mixed type sizes. */
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    /** Main-axis distribution. `between` pushes the first and last child to the ends. */
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    /**
     * Let children wrap onto a new line. On by default for Inline, off for
     * Stack; turn it off on a row only when its children can shrink, or it
     * overflows a phone.
     */
    wrap: { true: 'flex-wrap', false: '' },
  },
  defaultVariants: { direction: 'column', gap: 'md', wrap: false },
})

export interface StackProps extends React.ComponentProps<'div'>, Variants<typeof stackVariants> {}

/** Vertical rhythm: children down a column, one gap between them. */
export function Stack({ className, direction, gap, align, justify, wrap, ...props }: StackProps) {
  return <div data-slot="stack" className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)} {...props} />
}

export type InlineProps = Omit<StackProps, 'direction'>

/**
 * A row that wraps — toolbars, badge rows, button groups. Wraps by default,
 * because a row of controls that cannot wrap is the thing that forces a
 * 508px-wide document on a 390px phone (a real defect this system shipped).
 */
export function Inline({ className, gap = 'sm', align = 'center', wrap = true, justify, ...props }: InlineProps) {
  return (
    <div data-slot="inline" className={cn(stackVariants({ direction: 'row', gap, align, justify, wrap }), className)} {...props} />
  )
}

/** One thing on the left, one on the right: a panel header, a table toolbar. */
export function RowBetween({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="row-between" className={cn('flex min-w-0 items-center justify-between gap-6', className)} {...props} />
}
