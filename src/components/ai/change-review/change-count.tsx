'use client'

import type * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessagesOverride, useMessages } from '../../../lib/messages'
import { type ChangeCountMessages, changeCountMessages } from './messages'

export interface ChangeCountProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Lines added. Shown as "+n" and said as "n lines added". */
  added: number
  /** Lines removed. Shown as "−n" and said as "n lines removed". */
  removed: number
  /** Words for translation: the sentence a screen reader hears. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<ChangeCountMessages>
}

/**
 * "+12 −3": the size of a change, at a glance.
 *
 * A screen reader given the glyphs reads "plus twelve minus three", or worse
 * "twelve minus three" — a subtraction. So the figures are hidden from it and
 * a sentence is said instead: "12 lines added, 3 removed". The figures are
 * `dir="ltr"` so a right-to-left page does not turn "+12" into "12+".
 */
export function ChangeCount({ added, removed, messages, className, ...props }: ChangeCountProps) {
  const [t, f] = useMessages('changeCount', changeCountMessages, messages)
  return (
    <span data-slot="change-count" className={cn('inline-flex items-baseline font-ui text-xs font-semibold tabular', className)} {...props}>
      <span aria-hidden dir="ltr" className="inline-flex gap-2">
        <span className="text-ink-success">+{f.number(added)}</span>
        <span className="text-ink-danger">−{f.number(removed)}</span>
      </span>
      <span className="sr-only">
        {f.format(t.summary, { added: f.plural(t.lines, added), removed: f.plural(t.lines, removed) })}
      </span>
    </span>
  )
}
