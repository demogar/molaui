'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useMergedRefs } from '../../lib/merge-props'
import { deprecate } from '../../lib/deprecate'
import { useScrollEdge } from '../../lib/scroll-edge'
import { EmptyState, type EmptyStateProps } from '../empty-state'
import { skeletonShimmer } from '../skeleton/skeleton'

/**
 * The table primitives. A table in an internal tool is read for hours, so
 * every decision here is about the eye travelling down a column:
 *
 *   - Rows are `--row-h` tall, so one density attribute decides how many runs
 *     fit on a laptop screen; no row ever sets its own height.
 *   - Numbers are right-aligned in tabular figures. A cost column whose digits
 *     do not line up cannot be compared by eye, and comparing is the job.
 *   - Row dividers are `--keyline-soft`, decorative and quiet. The header rule
 *     is ink: it is the one structural edge, where the labels stop and the
 *     data starts.
 *   - Header labels are in the rótulo register — expanded caps — so they read
 *     as labels cut onto the panel, not as a first row of data.
 *
 * The edges are inset `box-shadow`s rather than borders. With
 * `border-collapse`, a sticky header cell's border scrolls away with the body
 * and leaves the labels floating over the data; a shadow is painted by the
 * cell itself and travels with it.
 */

const TableContext = React.createContext<{ stickyHeader: boolean }>({ stickyHeader: false })

export interface TableProps extends React.ComponentProps<'table'> {
  /** Keep the header row visible while the body scrolls. Give the frame a height via `frameClassName`. */
  stickyHeader?: boolean
  /** Bound the table with a keyline on a raised ground — for a table that is the panel. */
  framed?: boolean
  /** Classes for the scrolling frame, e.g. `max-h-96`. */
  frameClassName?: string
}

export function Table({
  stickyHeader = false,
  framed = false,
  className,
  frameClassName,
  ...props
}: TableProps) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const overflows = useOverflows(frameRef)
  const setFrame = useMergedRefs(frameRef, useScrollEdge<HTMLDivElement>())
  return (
    <TableContext.Provider value={{ stickyHeader }}>
      <div
        ref={setFrame}
        data-slot="table-frame"
        // A scrolling region has to be reachable by keyboard, or its overflow is
        // unreachable to anyone without a wheel. Named by the table inside it.
        // It was focusable only with `stickyHeader`, but any table wider than
        // its frame scrolls sideways — every wide table on a phone — so it
        // is focusable whenever it actually overflows, and only then: a table
        // that fits should not add a stop to the tab order.
        tabIndex={stickyHeader || overflows ? 0 : undefined}
        className={cn(
          'relative w-full overflow-auto scroll-cloth scroll-edge',
          framed && 'bg-cloth-pale shadow-cut',
          'focus-visible:focus-ring',
          frameClassName,
        )}
      >
        <table
          data-slot="table"
          className={cn('w-full border-separate border-spacing-0 font-ui text-sm text-ink', className)}
          {...props}
        />
      </div>
    </TableContext.Provider>
  )
}

/**
 * Whether the frame scrolls, and, as `--table-viewport` on the frame, the
 * inline size of what is visible through it. TableEmpty sizes its message to
 * that. CSS alone cannot give it: a percentage inside the table resolves
 * against the table, which is the full scrolled width. Container query units
 * would need `container-type` on the frame, and inline-size containment
 * collapses a frame whose parent sizes to its content. The property is
 * written straight onto the element rather than through state, so a resize
 * restyles one cell instead of re-rendering every row.
 *
 * It is written only while the table is empty, which is the only time
 * anything reads it. A custom property on the frame is inherited by every
 * cell, so writing it restyles the whole table, and the observer fires on
 * every frame of a resize: collapsing the app shell's sidebar beside a
 * populated table cost 57 ms of style recalculation over the 200 ms ease,
 * all of it for a value no cell used. Emptying or filling the table changes
 * its height, so the observer runs again and the property follows.
 */
function useOverflows(ref: React.RefObject<HTMLElement | null>) {
  const [overflows, setOverflows] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      if (el.querySelector('[data-slot="table-empty"]')) el.style.setProperty('--table-viewport', `${el.clientWidth}px`)
      else el.style.removeProperty('--table-viewport')
      setOverflows(el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // The table inside grows with its rows without the frame resizing.
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    measure()
    return () => observer.disconnect()
  }, [ref])
  return overflows
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

export function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      data-part="footer"
      className={cn(
        'font-semibold [&_td]:bg-cloth-shade [&_td]:cut-t',
        className,
      )}
      {...props}
    />
  )
}

export interface TableRowProps extends React.ComponentProps<'tr'> {
  /**
   * The row is part of the current selection. Gold, because gold is the
   * layer this system marks a choice with — it is also the text-selection
   * colour — while añil stays free to mean "information". The fill is a wash,
   * not the layer, so every ink in the row still clears AA; and an ink bar on
   * the leading edge carries the state for anyone who cannot see the hue.
   */
  selected?: boolean
}

export function TableRow({ selected = false, className, ...props }: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      data-part="row"
      data-selected={selected || undefined}
      aria-selected={selected || undefined}
      className={cn(
        'transition-colors',
        '[&>td]:rule-b-soft',
        'hover:[&>td]:bg-ink-soft',
        'data-selected:[&>td]:bg-selected data-selected:[&>td]:forced-selected',
        'data-selected:[&>td:first-child]:bar-start-ink',
        className,
      )}
      {...props}
    />
  )
}

export type TableSortDirection = 'ascending' | 'descending' | 'none'

export interface TableHeadProps extends React.ComponentProps<'th'> {
  /** Right-align, for a column of figures. Header and cells must agree or the label floats off its numbers. */
  numeric?: boolean
  /**
   * Makes the header a sort control. `none` renders the control in its idle
   * state; `aria-sort` is only set on the column actually sorted, because
   * announcing "not sorted" on every column is noise.
   */
  sort?: TableSortDirection
  /**
   * Called when the header's sort control is pressed. The page decides the next
   * direction; only used with `sort`.
   */
  onSort?: () => void
  /**
   * A column resize handle, drawn after the label and outside the sort
   * control, so the two are separate tab stops. DataTable passes its own with
   * `resizableColumns`; give the header `relative` (or keep it sticky) so the
   * handle can sit on its trailing edge.
   */
  resizer?: React.ReactNode
}

export function TableHead({
  numeric = false,
  sort,
  onSort,
  resizer,
  className,
  children,
  ...props
}: TableHeadProps) {
  const { stickyHeader } = React.useContext(TableContext)
  const sortable = sort !== undefined
  const Glyph = sort === 'ascending' ? ArrowUp : sort === 'descending' ? ArrowDown : ArrowUpDown

  return (
    <th
      data-slot="table-head"
      data-part="head"
      scope="col"
      aria-sort={sortable && sort !== 'none' ? sort : undefined}
      className={cn(
        'h-(--row-h) bg-cloth-pale px-3 align-middle',
        'rotulo whitespace-nowrap text-ink-2',
        'cut-b',
        numeric ? 'text-end' : 'text-start',
        stickyHeader && 'sticky top-0 z-(--z-sticky)',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'group/sort -mx-1.5 inline-flex items-center gap-1.5 px-1.5 py-1 uppercase',
            'tracking-[inherit] [font:inherit]',
            'hover:text-ink',
            numeric && 'flex-row-reverse',
          )}
        >
          {children}
          <Glyph
            aria-hidden
            className={cn(
              'size-(--icon-xs) shrink-0 transition-colors',
              sort === 'none' ? 'text-ink-muted group-hover/sort:text-ink' : 'text-ink',
            )}
          />
        </button>
      ) : (
        children
      )}
      {resizer}
    </th>
  )
}

export interface TableCellProps extends React.ComponentProps<'td'> {
  /** Right-aligned tabular figures. */
  numeric?: boolean
  /**
   * Cut long content to one line with an ellipsis. The full text goes in
   * `title` when the content is a string, so it is never lost — only folded.
   */
  truncate?: boolean
}

export function TableCell({
  numeric = false,
  truncate = false,
  className,
  children,
  title,
  ...props
}: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      title={title ?? (truncate && typeof children === 'string' ? children : undefined)}
      className={cn(
        'h-(--row-h) px-3 align-middle',
        // A machine literal in a cell never breaks: an id is read character
        // by character (ADR 0003), and at 768 "cayuco-" / "steady-3" on two
        // lines read as two ids. The column takes the width, and the frame
        // scrolls with its edge cue when there is not enough.
        '[&_.literal]:whitespace-nowrap [&_code]:whitespace-nowrap',
        numeric && 'text-end tabular-nums',
        truncate && 'max-w-0 truncate',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

export function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      data-part="caption"
      className={cn('caption-bottom px-3 pt-3 text-start text-xs text-ink-muted', className)}
      {...props}
    />
  )
}

/**
 * The empty state, as a row. It spans the table rather than replacing it, so
 * the headers stay and the reader still knows what would have been here.
 *
 * It is `EmptyState` — the same four conversations (empty, no results, error,
 * no permission) and the same relleno slot — drawn without its own keyline,
 * because the table frame is already the edge, and a second cut inside it
 * reads as a box in a box.
 *
 * ── centred on what is visible, not on the table ──
 * The cell spans every column, so on a phone, where a wide table scrolls
 * sideways, centring in the cell put the message in the middle of a table
 * three screens wide: half of it off the frame, and its action out of reach
 * until the reader scrolled to find it. The message is wrapped in a block as
 * wide as the frame's visible area (`--table-viewport`, measured by `Table`)
 * and stuck to the inline start, so it is centred in what the reader sees
 * and stays there while the headers scroll past above it. `start-0` is
 * `inset-inline-start`, so in right-to-left it sticks to the right edge,
 * where that table's scroll begins. Before the frame is measured (server
 * render, no ResizeObserver) the block is the cell's width, as it was.
 */
export interface TableEmptyProps extends Omit<React.ComponentProps<'tr'>, 'title'> {
  /**
   * How many columns the row spans: all of them, including a checkbox column, or
   * the empty state sits in the first cell.
   */
  colSpan: number
  /**
   * The empty state's heading. Defaults to "Nothing here yet"; the children become
   * its description.
   */
  title?: React.ReactNode
  /**
   * Why it is empty, as on `EmptyState`: `empty` (the default), `no-results` when
   * filters emptied it, `error`, or `no-permission`.
   */
  kind?: EmptyStateProps['kind']
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `kind`, as on
   * `EmptyState`.
   */
  variant?: EmptyStateProps['kind']
  /** One or two buttons; for a filtered table, the one that clears the filters. */
  actions?: React.ReactNode
}

/** `className`, `ref` and the rest of the DOM props go to the `<tr>`. */
export function TableEmpty({
  colSpan,
  title = 'Nothing here yet',
  kind,
  variant,
  actions,
  children,
  ...props
}: TableEmptyProps) {
  if (variant !== undefined) {
    deprecate('table-empty-variant', { what: '<TableEmpty variant>', instead: '<TableEmpty kind>', removal: '1.0.0' })
  }
  return (
    <tr {...props} data-slot="table-empty">
      <td colSpan={colSpan} className="p-0">
        <div className="sticky start-0 w-[var(--table-viewport,100%)] max-w-full">
          <EmptyState
            size="sm"
            kind={kind ?? variant}
            title={title}
            description={children}
            actions={actions}
            // The error seam's keyline is drawn outside it, and at the table's
            // full width that 1.5px fell outside the scrolling frame, which
            // clips it. Inset by the keyline, it stays inside. Found by the
            // Table hard-states story.
            className="shadow-none forced-colors:outline-none [&>[data-part=seam]]:inset-x-(--cut-w)"
          />
        </div>
      </td>
    </tr>
  )
}

export interface TableSkeletonRowsProps {
  /** How many rows to draw. */
  rows?: number
  /**
   * How many cells each row draws: the table's column count, including a checkbox
   * column.
   */
  columns: number
}

/**
 * Loading rows: real rows at the real height, so the table does not jump when
 * the data lands. Bar widths vary by a fixed pattern rather than at random, so
 * a re-render does not make the skeleton twitch.
 *
 * One sweep per row, not one per bar. Each bar carried Skeleton's own sweep,
 * so a ten-row, five-column loading table ran fifty infinite animations, each
 * its own compositor layer, and a dashboard with two tables twice that. The
 * band now crosses the whole row (the row is its containing block), over bars
 * that stay put; in a framed table the band is the frame's own cloth, so
 * between the bars it does not show, and the look is what it was.
 *
 * No `className`, `ref` or rest props: it renders several rows and no
 * element of its own, so there is no one element they could honestly go to.
 */
export function TableSkeletonRows({ rows = 5, columns }: TableSkeletonRowsProps) {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/12', 'w-7/12']
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} data-slot="table-skeleton-row" aria-hidden className="relative">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="h-(--row-h) px-3 align-middle rule-b-soft">
              <span className={cn('block h-2.5 bg-cloth-deep relleno-field', widths[(r + c * 2) % widths.length])} />
              {c === 0 ? <span className={cn(skeletonShimmer, 'absolute inset-x-0 top-0 bottom-px')} /> : null}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export interface TableCheckboxProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  /** Some but not all rows are selected. A DOM property, not an attribute, so it is set by effect. */
  indeterminate?: boolean
}

/**
 * A native checkbox, drawn as a cut square. Native, so space toggles it, forms
 * submit it and screen readers announce it with no ARIA to keep in sync; the
 * visible square is a sibling painted from the input's own `:checked` and
 * `:indeterminate` state.
 */
export function TableCheckbox({ indeterminate = false, className, ref: refProp, ...props }: TableCheckboxProps) {
  // Merged with the consumer's ref rather than replaced by it: when a passed
  // ref won, this one was never attached and `indeterminate` silently stopped.
  const ref = React.useRef<HTMLInputElement>(null)
  const mergedRef = useMergedRefs(ref, refProp)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <span data-slot="table-checkbox" className={cn('relative inline-grid size-4 shrink-0 place-items-center align-middle', className)}>
      <input
        type="checkbox"
        className={cn(
          'peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-none',
          'bg-cloth-pale shadow-cut transition-colors',
          'checked:bg-ink indeterminate:bg-ink',
          'focus-visible:focus-ring',
          'disabled:cursor-not-allowed disabled:bg-disabled',
        )}
        {...props}
        ref={mergedRef}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none relative size-(--icon-xs) text-on-ink opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
      />
      <Minus
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute size-(--icon-xs) text-on-ink opacity-0 peer-indeterminate:opacity-100"
      />
    </span>
  )
}
