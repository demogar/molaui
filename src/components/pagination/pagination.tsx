import { ChevronLeft, ChevronRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { IconButton } from '../button'

/**
 * Moving through a long, ordered result — runs, documents, audit events.
 *
 * Two variants, because a page of numbers is the wrong control for most
 * tables in a tool:
 *
 *   pages    1 … 4 5 6 … 26. For results where the page itself is a place
 *            people return to ("it was on page 3"). The current page is the
 *            ink-filled square — the same cut the selected chip and the
 *            highlighted menu row make — with `aria-current="page"`.
 *   compact  "51–100 of 1,284" and two arrows. For dense tables, where the
 *            reader wants to know how much is left, not to jump to page 17.
 *
 * The range is always the same number of slots for a given `siblings`, so the
 * control does not change width as you page and the next-arrow never moves out
 * from under the pointer. Every figure is tabular for the same reason.
 *
 * The page numbers are buttons, not links: this component does not own your
 * URLs. Wire `onPageChange` to the router if a page should be addressable.
 */

export type PageRangeItem = number | 'ellipsis-start' | 'ellipsis-end'

/** The visible slots for `page` of `pageCount` (both 1-based). Always `5 + 2 × siblings` long once it needs ellipses. */
export function getPageRange(page: number, pageCount: number, siblings = 1): PageRangeItem[] {
  const slots = siblings * 2 + 5
  if (pageCount <= slots) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const current = Math.min(Math.max(page, 1), pageCount)
  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, pageCount)
  const showStart = left > 3
  const showEnd = right < pageCount - 2
  const edge = 3 + 2 * siblings

  if (!showStart) {
    return [...Array.from({ length: edge }, (_, i) => i + 1), 'ellipsis-end', pageCount]
  }
  if (!showEnd) {
    return [1, 'ellipsis-start', ...Array.from({ length: edge }, (_, i) => pageCount - edge + 1 + i)]
  }
  return [1, 'ellipsis-start', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), 'ellipsis-end', pageCount]
}

const fmt = (n: number) => n.toLocaleString('en-US')

export interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  /** 1-based. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  variant?: 'pages' | 'compact'
  /** Pages either side of the current one in the `pages` variant. */
  siblings?: number
  /** For the compact range text: rows per page and the total row count. */
  pageSize?: number
  total?: number
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  variant = 'pages',
  siblings = 1,
  pageSize,
  total,
  className,
  'aria-label': ariaLabel = 'Pagination',
  ...props
}: PaginationProps) {
  const prev = (
    <IconButton label="Previous page" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
      <ChevronLeft className="rtl:-scale-x-100" />
    </IconButton>
  )
  const next = (
    <IconButton label="Next page" variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
      <ChevronRight className="rtl:-scale-x-100" />
    </IconButton>
  )

  if (variant === 'compact') {
    const from = pageSize ? (page - 1) * pageSize + 1 : page
    const to = pageSize ? Math.min(page * pageSize, total ?? page * pageSize) : page
    return (
      <nav aria-label={ariaLabel} data-slot="pagination" className={cn('flex items-center gap-3', className)} {...props}>
        <p className="m-0 font-ui text-sm tabular-nums text-ink-2" aria-live="polite">
          {pageSize && total !== undefined ? (
            <>
              <span className="font-semibold text-ink">
                {fmt(from)}–{fmt(to)}
              </span>{' '}
              of {fmt(total)}
            </>
          ) : (
            <>
              Page <span className="font-semibold text-ink">{fmt(page)}</span> of {fmt(pageCount)}
            </>
          )}
        </p>
        <div className="flex gap-1.5">
          {prev}
          {next}
        </div>
      </nav>
    )
  }

  return (
    <nav aria-label={ariaLabel} data-slot="pagination" className={className} {...props}>
      <ul className="m-0 flex list-none items-center gap-1 p-0">
        <li className="me-1">{prev}</li>
        {getPageRange(page, pageCount, siblings).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onPageChange(item)}
                className={cn(
                  'inline-grid h-(--control-h-sm) min-w-(--control-h-sm) cursor-pointer place-items-center rounded-none px-1.5',
                  'font-ui text-sm font-semibold tabular-nums text-ink-2',
                  'transition-[background-color,color] duration-(--motion-cut) ease-cut',
                  'hover:bg-ink-soft hover:text-ink',
                  'aria-[current=page]:bg-ink aria-[current=page]:text-on-ink aria-[current=page]:forced-selected',
                )}
              >
                {fmt(item)}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden className="grid h-(--control-h-sm) min-w-5 place-items-center text-sm text-ink-muted">
              …
            </li>
          ),
        )}
        <li className="ms-1">{next}</li>
      </ul>
    </nav>
  )
}
