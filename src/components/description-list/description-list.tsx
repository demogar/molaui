import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Term and value pairs — the properties panel of every run, document and
 * experiment. Three layouts, each the answer to a different reading task:
 *
 *   inline   term left, value right-aligned against it, quiet rules between.
 *            For a side panel scanned top to bottom: "what model? what cost?"
 *            Ported from Must Do Panama's independence disclosure.
 *   stacked  term above value, a fixed term column from `sm` up. For values
 *            long enough to wrap — a prompt, a description, a URL.
 *   grid     two columns under one heavy ink rule, value in body type under
 *            its term. For a summary block closing a section. Ported from the
 *            itinerary fact grid.
 *
 * `<div>` wrappers around each pair, not bare `<dt>`/`<dd>` siblings: it is
 * the one grouping a `<dl>` permits, and without it the grid would lay out
 * cells in reading order rather than pairs.
 *
 * Mark a value `literal` and it is set in the machine face — a run id, a
 * hash, a model string — so it is never mistaken for prose.
 */

export interface DescriptionItem {
  term: React.ReactNode
  detail: React.ReactNode
  /** Set the value in Martian Mono: ids, hashes, model strings, paths. */
  literal?: boolean
  /** Stable key when `term` is not a string. */
  id?: string
}

const listVariants = cva('m-0', {
  variants: {
    layout: {
      inline: '',
      stacked: '',
      grid: 'grid grid-cols-1 gap-x-8 gap-y-4 pt-4 shadow-[inset_0_1.5px_0_var(--ink)] sm:grid-cols-2',
    },
  },
  defaultVariants: { layout: 'inline' },
})

const pairVariants = cva('min-w-0', {
  variants: {
    layout: {
      inline:
        'flex items-baseline justify-between gap-4 py-2 shadow-[inset_0_-1px_0_var(--keyline-soft)] last:shadow-none',
      stacked:
        'grid grid-cols-1 gap-1 py-3 shadow-[inset_0_-1px_0_var(--keyline-soft)] last:shadow-none sm:grid-cols-[minmax(7rem,11rem)_1fr] sm:gap-6',
      grid: '',
    },
  },
})

const termVariants = cva('m-0', {
  variants: {
    layout: {
      inline: 'shrink-0 text-sm text-ink-2',
      stacked: 'rotulo pt-[0.3em] text-ink-muted',
      grid: 'rotulo text-ink-muted',
    },
  },
})

const detailVariants = cva('m-0 min-w-0 text-ink', {
  variants: {
    layout: {
      inline: 'text-right text-sm tabular-nums break-words',
      stacked: 'text-sm break-words',
      grid: 'mt-1 text-base',
    },
  },
})

export interface DescriptionListProps
  extends Omit<React.ComponentProps<'dl'>, 'children'>,
    VariantProps<typeof listVariants> {
  items: DescriptionItem[]
}

export function DescriptionList({ items, layout = 'inline', className, ...props }: DescriptionListProps) {
  return (
    <dl data-slot="description-list" className={cn(listVariants({ layout }), className)} {...props}>
      {items.map((item, i) => (
        <div
          key={item.id ?? (typeof item.term === 'string' ? item.term : i)}
          className={pairVariants({ layout })}
        >
          <dt className={termVariants({ layout })}>{item.term}</dt>
          <dd className={cn(detailVariants({ layout }), item.literal && 'literal text-ink-2')}>{item.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
