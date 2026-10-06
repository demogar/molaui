import type * as React from 'react'

import { cn } from '../../../lib/cn'

export interface ChangeCountProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  added: number
  removed: number
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

/**
 * "+12 −3": the size of a change, at a glance.
 *
 * A screen reader given the glyphs reads "plus twelve minus three", or worse
 * "twelve minus three" — a subtraction. So the figures are hidden from it and
 * a sentence is said instead: "12 lines added, 3 removed". The figures are
 * `dir="ltr"` so a right-to-left page does not turn "+12" into "12+".
 */
export function ChangeCount({ added, removed, className, ...props }: ChangeCountProps) {
  return (
    <span data-slot="change-count" className={cn('inline-flex items-baseline font-ui text-xs font-semibold tabular', className)} {...props}>
      <span aria-hidden dir="ltr" className="inline-flex gap-2">
        <span className="text-ink-success">+{added.toLocaleString('en-US')}</span>
        <span className="text-ink-danger">−{removed.toLocaleString('en-US')}</span>
      </span>
      <span className="sr-only">
        {plural(added, 'line', 'lines')} added, {plural(removed, 'line', 'lines')} removed
      </span>
    </span>
  )
}
