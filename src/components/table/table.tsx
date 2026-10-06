import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
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
  return (
    <TableContext.Provider value={{ stickyHeader }}>
      <div
        data-slot="table-frame"
        // A scrolling region has to be reachable by keyboard, or its overflow is
        // unreachable to anyone without a wheel. Named by the table inside it.
        tabIndex={stickyHeader ? 0 : undefined}
        className={cn(
          'relative w-full overflow-auto scroll-cloth',
          framed && 'bg-cloth-pale shadow-cut',
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
      className={cn(
        'font-semibold [&_td]:bg-cloth-shade [&_td]:shadow-[inset_0_1.5px_0_var(--ink)]',
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
      data-selected={selected || undefined}
      aria-selected={selected || undefined}
      className={cn(
        'transition-colors duration-(--motion-cut) ease-cut',
        '[&>td]:shadow-[inset_0_-1px_0_var(--keyline-soft)]',
        'hover:[&>td]:bg-ink-soft',
        'data-selected:[&>td]:bg-oro-soft data-selected:[&>td]:forced-selected',
        'data-selected:[&>td:first-child]:shadow-[inset_3px_0_0_var(--ink),inset_0_-1px_0_var(--keyline-soft)]',
        'rtl:data-selected:[&>td:first-child]:shadow-[inset_-3px_0_0_var(--ink),inset_0_-1px_0_var(--keyline-soft)]',
        className,
      )}
      {...props}
    />
  )
}

type SortDirection = 'ascending' | 'descending' | 'none'

export interface TableHeadProps extends React.ComponentProps<'th'> {
  /** Right-align, for a column of figures. Header and cells must agree or the label floats off its numbers. */
  numeric?: boolean
  /**
   * Makes the header a sort control. `none` renders the control in its idle
   * state; `aria-sort` is only set on the column actually sorted, because
   * announcing "not sorted" on every column is noise.
   */
  sort?: SortDirection
  onSort?: () => void
}

export function TableHead({
  numeric = false,
  sort,
  onSort,
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
      scope="col"
      aria-sort={sortable && sort !== 'none' ? sort : undefined}
      className={cn(
        'h-(--row-h) bg-cloth-pale px-3 align-middle',
        'rotulo whitespace-nowrap text-ink-2',
        'shadow-[inset_0_-1.5px_0_var(--ink)]',
        numeric ? 'text-end' : 'text-start',
        stickyHeader && 'sticky top-0 z-10',
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
              'size-3 shrink-0 transition-opacity duration-(--motion-cut)',
              sort === 'none' ? 'opacity-40 group-hover/sort:opacity-100' : 'text-ink',
            )}
          />
        </button>
      ) : (
        children
      )}
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
 */
export function TableEmpty({
  colSpan,
  title = 'Nothing here yet',
  variant,
  actions,
  children,
}: {
  colSpan: number
  title?: React.ReactNode
  variant?: EmptyStateProps['variant']
  /** One or two buttons; for a filtered table, the one that clears the filters. */
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <tr data-slot="table-empty">
      <td colSpan={colSpan} className="p-0">
        <EmptyState
          size="sm"
          variant={variant}
          title={title}
          description={children}
          actions={actions}
          className="shadow-none forced-colors:outline-none"
        />
      </td>
    </tr>
  )
}

/**
 * Loading rows: real rows at the real height, so the table does not jump when
 * the data lands. Bar widths vary by a fixed pattern rather than at random, so
 * a re-render does not make the skeleton twitch.
 */
export function TableSkeletonRows({ rows = 5, columns }: { rows?: number; columns: number }) {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/12', 'w-7/12']
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} data-slot="table-skeleton-row" aria-hidden>
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="h-(--row-h) px-3 align-middle shadow-[inset_0_-1px_0_var(--keyline-soft)]">
              <span
                className={cn(
                  'block h-2.5 bg-cloth-deep relleno-field',
                  skeletonShimmer,
                  widths[(r + c * 2) % widths.length],
                )}
              />
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
export function TableCheckbox({ indeterminate = false, className, ...props }: TableCheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <span className={cn('relative inline-grid size-4 shrink-0 place-items-center align-middle', className)}>
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-none',
          'bg-cloth-pale shadow-cut transition-colors duration-(--motion-cut)',
          'checked:bg-ink indeterminate:bg-ink',
          'focus-visible:shadow-[var(--focus-ring)]',
          'disabled:cursor-not-allowed disabled:bg-cloth-shade',
        )}
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none relative size-3 text-on-ink opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
      />
      <Minus
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute size-3 text-on-ink opacity-0 peer-indeterminate:opacity-100"
      />
    </span>
  )
}
