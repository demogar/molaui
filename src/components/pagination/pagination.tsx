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

/**
 * The `siblings` range and the no-siblings range in one list, each item
 * marked with the range it belongs to, so CSS can show one or the other.
 *
 * On a phone the full range does not fit at spacious density: seven slots and
 * two arrows at 36px are 364px, wider than a 320px screen (#130). Below 25rem
 * of viewport the control drops to `siblings = 0`, five slots ("1 … 5 … 26"),
 * which is still a fixed count, so the arrows still do not move as you page.
 *
 * A container query was the first choice, since the control's own width is
 * what matters, but `container-type: inline-size` takes a box's width away
 * from its content, and a pagination sits as a flex item beside its range
 * text (DataTable's footer), where it collapsed to nothing. The list also
 * wraps, as the last resort for a narrow container on a wide screen.
 *
 * The two ranges never show an item at the same time where they disagree, so
 * merging them by position is enough: an ellipsis sits just after page 1 or
 * just before the last page.
 */
function responsiveRange(page: number, pageCount: number, siblings: number) {
  const wide = getPageRange(page, pageCount, siblings)
  const narrow = siblings > 0 ? getPageRange(page, pageCount, 0) : wide
  const at = (item: PageRangeItem) =>
    item === 'ellipsis-start' ? 1.5 : item === 'ellipsis-end' ? pageCount - 0.5 : item
  return [...new Set([...wide, ...narrow])]
    .sort((a, b) => at(a) - at(b))
    .map((item) => ({ item, wide: wide.includes(item), narrow: narrow.includes(item) }))
}

const onlyWide = 'max-[25rem]:hidden'
const onlyNarrow = 'min-[25rem]:hidden'

const fmt = (n: number) => n.toLocaleString('en-US')

export interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  /** 1-based. */
  page: number
  /** How many pages there are. The next button is disabled on the last. */
  pageCount: number
  /**
   * Called with the 1-based page a person asked for. The page is controlled: set
   * `page` from it, or from the router if pages are addressable.
   */
  onPageChange: (page: number) => void
  /**
   * `pages` (the default) for results where a page is a place people return to;
   * `compact` ("51–100 of 1,284" and two arrows) for dense tables where how much is
   * left matters more.
   */
  variant?: 'pages' | 'compact'
  /** Pages either side of the current one in the `pages` variant. */
  siblings?: number
  /** For the compact range text: rows per page and the total row count. */
  pageSize?: number
  /**
   * Total row count for the `compact` range text. Without it, or without `pageSize`,
   * the text falls back to "Page 3 of 26".
   */
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
      <ChevronLeft className="flip-rtl" />
    </IconButton>
  )
  const next = (
    <IconButton label="Next page" variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
      <ChevronRight className="flip-rtl" />
    </IconButton>
  )

  if (variant === 'compact') {
    const from = pageSize ? (page - 1) * pageSize + 1 : page
    const to = pageSize ? Math.min(page * pageSize, total ?? page * pageSize) : page
    return (
      <nav aria-label={ariaLabel} data-slot="pagination" className={cn('flex items-center gap-3', className)} {...props}>
        {/* `dir="auto"`, so "1–25 of 40" keeps its order in a right-to-left page. */}
        <p dir="auto" className="m-0 font-ui text-sm tabular-nums text-ink-2" aria-live="polite">
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
      <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        <li className="me-1">{prev}</li>
        {responsiveRange(page, pageCount, siblings).map(({ item, wide, narrow }) => {
          const only = wide && narrow ? undefined : wide ? onlyWide : onlyNarrow
          return typeof item === 'number' ? (
            <li key={item} className={only}>
              <button
                type="button"
                aria-current={item === page ? 'page' : undefined}
                // The name carries the number as it is shown ("12,480"), or a
                // speech-input user saying what they see does not match it.
                aria-label={`Page ${fmt(item)}`}
                onClick={() => onPageChange(item)}
                className={cn(
                  'inline-grid h-(--control-h-sm) min-w-(--control-h-sm) cursor-pointer place-items-center rounded-none px-1.5',
                  'font-ui text-sm font-semibold tabular-nums text-ink-2',
                  'transition-[background-color,color]',
                  'hover:bg-ink-soft hover:text-ink active:cut-press',
                  'aria-[current=page]:bg-ink aria-[current=page]:text-on-ink aria-[current=page]:forced-selected',
                )}
              >
                {fmt(item)}
              </button>
            </li>
          ) : (
            <li
              key={item}
              aria-hidden
              className={cn('grid h-(--control-h-sm) min-w-5 place-items-center text-sm text-ink-muted', only)}
            >
              …
            </li>
          )
        })}
        <li className="ms-1">{next}</li>
      </ul>
    </nav>
  )
}
