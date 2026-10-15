'use client'

import { Columns3, Plus, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, type PluralMessage, useMessages } from '../../lib/messages'
import { useMergedRefs } from '../../lib/merge-props'
import { useScrollEdge } from '../../lib/scroll-edge'
import { useControllable } from '../../lib/use-controllable'
import { Button, IconButton } from '../button'
import type { EmptyStateProps } from '../empty-state'
import { Menu, MenuCheckboxItem, MenuContent, MenuGroup, MenuGroupLabel, MenuTrigger } from '../menu'
import { Pagination } from '../pagination'
import { type DataTableMessages, dataTableMessages } from './messages'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableCheckbox,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeletonRows,
} from './table'
import { useVirtualRows } from './use-virtual-rows'

/**
 * The convenience layer over the primitives: columns as data, sorting,
 * selection, column visibility and pagination. It deliberately does not fetch.
 * The moment a table component fetches, every screen that uses it inherits
 * one opinion about caching, so data stays with whatever owns it:
 *
 *   client   pass every row; the table sorts and slices them.
 *   manual   pass one page of rows already sorted by the server; the table
 *            reports `onSortChange` and `onPageChange` and applies neither.
 *
 * Every piece of state — sort, page, selection, hidden columns — is either
 * controlled (`sort` + `onSortChange`) or left to the table (`defaultSort`),
 * the same contract as a React input. The primitives remain the escape hatch
 * for anything this does not cover, such as virtual rows of varying height
 * (see the "Virtualized" story).
 *
 * The features for long, dense tables are each one prop, off by default,
 * because each changes something a reader relies on and should be a choice
 * per screen:
 *
 *   virtualize         only the rows in view are in the DOM (use-virtual-rows.ts
 *                      says what stays a real table, and what does not)
 *   resizableColumns   a focusable separator on each header's trailing edge,
 *                      dragged or moved with the arrow keys
 *   renderExpanded     a disclosure button per row and a detail row under it
 *   stickyFirstColumn  the identifying column stays put while the rest scrolls
 *   stackWhenNarrow    each row becomes a block of label and value pairs when
 *                      the table's container is narrower than 36rem
 */

export type SortValue = string | number | Date | null | undefined

export interface DataTableColumn<Row> {
  key: string
  header: React.ReactNode
  /** The column's name in plain text, for the column menu when `header` is not a string. */
  label?: string
  /** What the cell renders. Defaults to `String(row[key])`. */
  cell?: (row: Row) => React.ReactNode
  /** What the column sorts by. Required for a sortable column whose cell is not a plain value. */
  sortValue?: (row: Row) => SortValue
  sortable?: boolean
  /** `end` right-aligns in tabular figures — for every column of numbers. */
  align?: 'start' | 'end'
  /** A CSS width for the column, e.g. `'8rem'` or `'30%'`. */
  width?: string
  truncate?: boolean
  /** `false` keeps the column out of the column menu's reach — the identifying column, usually. */
  hideable?: boolean
  /** With `resizableColumns`, the narrowest the column can be made, in pixels. Defaults to 64. */
  minWidth?: number
  /** With `resizableColumns`, the widest the column can be made, in pixels. Defaults to 800. */
  maxWidth?: number
  /** `false` gives the column no resize handle when the table has `resizableColumns`. */
  resizable?: boolean
}

export interface DataTableSort {
  key: string
  direction: 'ascending' | 'descending'
}

/** The empty state, as data. A bare node is still accepted and becomes the description. */
export type DataTableEmpty = Pick<EmptyStateProps, 'title' | 'description' | 'actions' | 'kind' | 'variant'>

export interface DataTableBulkContext {
  /** The selected row ids, across every page. */
  selection: Set<string>
  /** Empties the selection. */
  clear: () => void
}

export interface DataTableProps<Row> extends Omit<React.ComponentProps<'table'>, 'children' | 'aria-label'> {
  /**
   * What each column shows, how it sorts and aligns, and whether it can be hidden.
   * Order is display order.
   */
  columns: DataTableColumn<Row>[]
  /**
   * The data. Every row when the table sorts and pages itself; one page, already
   * sorted, when `manual`. Never mutated.
   */
  rows: Row[]
  /**
   * A stable id per row. Selection is kept by id, so it survives sorting, paging
   * and a refetch that returns new objects.
   */
  getRowId: (row: Row) => string
  /** Names the table for assistive tech when there is no visible caption. */
  label?: string
  /**
   * A visible caption naming the table. Prefer it to `label` when the page has
   * room: a visible name helps every reader, not only assistive tech.
   */
  caption?: React.ReactNode
  /**
   * What a row is, for counts: `{ one: 'run', other: 'runs' }`. Any plural
   * category a language needs may be given (`few`, `many`); `other` is
   * required.
   */
  noun?: PluralMessage
  /** Words for translation: the counts, the selection names, the empty heading and the column menu. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<DataTableMessages>

  /** Sorting and paging are done by the server: rows are one page, already sorted. */
  manual?: boolean

  /** Controlled sort. `null` is "no sort"; leave undefined to let the table own it. */
  sort?: DataTableSort | null
  /**
   * The sort the table starts with when it owns sorting. Clicking a sorted header
   * cycles ascending → descending → off.
   */
  defaultSort?: DataTableSort
  /**
   * Called with the new sort, or `null` when it is turned off. With `manual`,
   * fetch the re-sorted page here; the table also resets to page 1.
   */
  onSortChange?: (sort: DataTableSort | null) => void

  /** Rows per page. Setting it turns pagination on. */
  pageSize?: number
  /** Controlled page, 1-based. */
  page?: number
  /** The page the table starts on when it owns paging, 1-based. Defaults to 1. */
  defaultPage?: number
  /** Called with the new page, 1-based. With `manual`, fetch that page here. */
  onPageChange?: (page: number) => void
  /** The total across every page, when `manual`. */
  rowCount?: number
  /**
   * `compact` (the default) is previous/next with the range; `pages` numbers the
   * pages, for a table where jumping matters more than stepping.
   */
  paginationVariant?: 'compact' | 'pages'

  /**
   * Adds a checkbox column and a select-all in the header. Select-all covers the
   * current page only, so paging never selects rows nobody has seen.
   */
  selectable?: boolean
  /** Controlled selection. Pair with `onSelectionChange`. */
  selection?: ReadonlySet<string>
  /** Row ids selected at the start when the table owns selection. */
  defaultSelection?: Iterable<string>
  /** Called with the new set of selected ids, across every page. */
  onSelectionChange?: (selection: Set<string>) => void
  /** How a row checkbox is named, e.g. `(run) => \`Select ${run.id}\``. */
  rowLabel?: (row: Row) => string
  /** Actions for the selected rows, shown in the bar above the table while any are selected. */
  bulkActions?: (context: DataTableBulkContext) => React.ReactNode

  /** Adds a "Columns" menu to the bar above the table. */
  columnMenu?: boolean
  /** Controlled hidden columns, by key. */
  hiddenColumns?: ReadonlySet<string>
  /**
   * Column keys hidden at the start when the table owns visibility. The reader can
   * bring them back from the column menu.
   */
  defaultHiddenColumns?: Iterable<string>
  /**
   * Called with the new set of hidden column keys — to remember the choice between
   * visits.
   */
  onHiddenColumnsChange?: (hidden: Set<string>) => void

  /**
   * Shows skeleton rows at the real row height in place of the body and says
   * "Loading…" in the bar, so the table does not jump when the data lands.
   */
  loading?: boolean
  /**
   * What shows when there are no rows: an empty state as data (title, description,
   * kind, actions), or a node that becomes its description. Use `kind: "no-
   * results"` when filters emptied it.
   */
  empty?: React.ReactNode | DataTableEmpty
  /**
   * Keeps the header row visible while the body scrolls. Give the frame a height
   * with `frameClassName`.
   */
  stickyHeader?: boolean
  /**
   * Bounds the table with a keyline on a raised ground, for a table that is the
   * panel rather than sitting in one.
   */
  framed?: boolean
  /** Classes for the scrolling frame around the table. */
  frameClassName?: string
  /** Classes for the outer element that holds the bar, the table and the pagination. */
  wrapperClassName?: string

  /**
   * Renders only the rows in view, plus a margin, between two spacer rows, and
   * sets `aria-rowcount` and `aria-rowindex` so assistive tech still hears the
   * full count. Give the frame a height with `frameClassName`. The rows that are
   * not rendered cannot be found with the browser's find-in-page, reached in a
   * screen reader's browse mode or printed, so pair a long virtual table with a
   * filter. Not combined with `stackWhenNarrow`, whose rows vary in height.
   */
  virtualize?: boolean

  /**
   * Puts a resize handle on the trailing edge of each column header but the
   * last, which takes the room that is left. Drag it, or focus it and use the
   * arrow keys; in right-to-left the keys follow the edge.
   */
  resizableColumns?: boolean
  /** Controlled column widths in pixels, by column key. Pair with `onColumnWidthsChange`. */
  columnWidths?: Readonly<Record<string, number>>
  /** Column widths in pixels at the start, by key, when the table owns them. */
  defaultColumnWidths?: Readonly<Record<string, number>>
  /**
   * Called with every column's width after a resize — to remember the layout
   * between visits. The first resize fixes each column at its rendered width.
   */
  onColumnWidthsChange?: (widths: Record<string, number>) => void

  /**
   * What a row shows when it is expanded. Setting it adds a disclosure button at
   * the start of each row, and a detail row under it while open.
   */
  renderExpanded?: (row: Row) => React.ReactNode
  /** Whether a row has anything to expand. Rows that return `false` get no button. */
  canExpand?: (row: Row) => boolean
  /** Controlled expanded rows, by id. Pair with `onExpandedChange`. */
  expanded?: ReadonlySet<string>
  /** Row ids expanded at the start when the table owns expansion. */
  defaultExpanded?: Iterable<string>
  /** Called with the new set of expanded row ids. */
  onExpandedChange?: (expanded: Set<string>) => void
  /** How a row's disclosure button is named, e.g. `(run) => \`Details of ${run.id}\``. */
  expandLabel?: (row: Row) => string

  /**
   * Keeps the first visible column, and the checkbox and disclosure columns
   * before it, in place while the table scrolls sideways, with an ink edge where
   * the frozen part ends.
   */
  stickyFirstColumn?: boolean

  /**
   * Below a 36rem container, draws each row as a block of label and value pairs
   * instead of a row that scrolls sideways — for action tables used on a phone.
   * The header stays as a bar of the sort and select-all controls. The table
   * keeps its table semantics.
   */
  stackWhenNarrow?: boolean
}

/** A column's default limits when resizing, in pixels. */
const MIN_WIDTH = 64
const MAX_WIDTH = 800
/** One arrow press, and one with Shift. */
const STEP = 16
const STEP_LARGE = 64

function compare(a: SortValue, b: SortValue): number {
  // Missing values sort last in both directions; that is handled by the caller
  // flipping only the non-null comparison.
  if (a instanceof Date) a = a.getTime()
  if (b instanceof Date) b = b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

function isEmptyData(empty: unknown): empty is DataTableEmpty {
  return typeof empty === 'object' && empty !== null && !React.isValidElement(empty) && 'title' in empty
}

const NO_ROWS: ReadonlySet<string> = new Set()

function columnName<Row>(column: DataTableColumn<Row>): string {
  return column.label ?? (typeof column.header === 'string' ? column.header : column.key)
}

/**
 * Right-to-left, read from the element itself: a table can sit in a
 * right-to-left region of a left-to-right page. The `dir` attribute is the
 * fallback for environments that compute no direction.
 */
function isRtl(el: HTMLElement): boolean {
  return getComputedStyle(el).direction === 'rtl' || el.closest('[dir]')?.getAttribute('dir') === 'rtl'
}

/**
 * The stacked layout (`stackWhenNarrow`) as container-query classes on the
 * wrapper's `@container/data-table`. `@max-xl` is below 36rem: a phone, or a
 * table in a narrow side panel. A container query rather than a media query,
 * because what decides is the room the table has, not the screen. Written out
 * in full rather than built from a prefix, because Tailwind finds classes by
 * reading the source.
 *
 * Each row becomes a two-column grid: the checkbox and disclosure cells in
 * the first column, and every data cell a line of its own in the second, its
 * column's name at the start and its value at the end. The header becomes a
 * bar holding only what can be pressed, the select-all box and the sort
 * buttons; a header with nothing to press is kept for screen readers only,
 * since every cell now shows its own label.
 *
 * The explicit roles (`table`, `row`, `cell`…) are there because changing a
 * table's `display` has made some browsers drop its table semantics; a role
 * keeps them whatever the CSS does.
 */
const STACK = {
  table: '@max-xl/data-table:block @max-xl/data-table:w-full @max-xl/data-table:min-w-0',
  head: '@max-xl/data-table:block',
  headRow: '@max-xl/data-table:flex @max-xl/data-table:flex-wrap @max-xl/data-table:items-center @max-xl/data-table:cut-b',
  // The bar's rule is the row's; a header cell's own ground would cover it.
  // 8px above and below, so a sort button's focus ring is not clipped by the
  // frame the bar sits at the top of.
  headCell: '@max-xl/data-table:h-auto @max-xl/data-table:bg-transparent @max-xl/data-table:py-2 @max-xl/data-table:[--edge-b:0_0_transparent]',
  body: '@max-xl/data-table:block',
  row: '@max-xl/data-table:grid @max-xl/data-table:grid-cols-[auto_minmax(0,1fr)] @max-xl/data-table:grid-flow-row-dense @max-xl/data-table:py-1.5 @max-xl/data-table:rule-b-soft @max-xl/data-table:[&>td]:[--edge-b:0_0_transparent] @max-xl/data-table:data-selected:bg-selected @max-xl/data-table:data-selected:bar-start-ink',
  lead: '@max-xl/data-table:col-start-1 @max-xl/data-table:h-auto @max-xl/data-table:py-1',
  cell: '@max-xl/data-table:col-start-2 @max-xl/data-table:flex @max-xl/data-table:h-auto @max-xl/data-table:max-w-none @max-xl/data-table:items-center @max-xl/data-table:justify-between @max-xl/data-table:gap-4 @max-xl/data-table:py-1',
  label: 'hidden shrink-0 rotulo text-start text-ink-2 @max-xl/data-table:block',
  detail: '@max-xl/data-table:block',
  unfreeze: '@max-xl/data-table:static @max-xl/data-table:[--edge-e:0_0_transparent]',
  hidden: '@max-xl/data-table:hidden',
}

/**
 * Where each frozen column sticks (`stickyFirstColumn`). The checkbox and
 * disclosure columns are each 2.75rem (`w-11`), so the first data column's
 * inset is the sum of the ones before it: 0, 2.75rem or 5.5rem. Logical
 * insets, so in right-to-left they stick to the right, where that scroll
 * starts.
 */
const FROZEN_INSET = ['start-0', 'start-11', 'start-22'] as const

/**
 * A detail row's content starts where the row's first data cell does, past
 * the checkbox and disclosure columns, so it reads as belonging to the row
 * above and not to the controls: 0.75rem of cell padding, plus 2.75rem per
 * column before it.
 */
const DETAIL_INSET = ['ps-3', 'ps-14', 'ps-25'] as const

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  label,
  caption,
  noun: nounProp,
  messages,
  manual = false,
  sort: controlledSort,
  defaultSort,
  onSortChange,
  pageSize,
  page: controlledPage,
  defaultPage = 1,
  onPageChange,
  rowCount,
  paginationVariant = 'compact',
  selectable = false,
  selection: controlledSelection,
  defaultSelection,
  onSelectionChange,
  rowLabel,
  bulkActions,
  columnMenu = false,
  hiddenColumns: controlledHidden,
  defaultHiddenColumns,
  onHiddenColumnsChange,
  loading = false,
  empty,
  stickyHeader = false,
  framed = false,
  frameClassName,
  wrapperClassName,
  virtualize = false,
  resizableColumns = false,
  columnWidths: controlledWidths,
  defaultColumnWidths,
  onColumnWidthsChange,
  renderExpanded,
  canExpand,
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  expandLabel,
  stickyFirstColumn = false,
  stackWhenNarrow = false,
  className,
  style,
  ref,
  ...props
}: DataTableProps<Row>) {
  const [t, f] = useMessages('dataTable', dataTableMessages, messages)
  const fmt = f.number
  const noun = nounProp ?? t.noun
  const bulkEdge = useScrollEdge<HTMLDivElement>()
  const tableRef = React.useRef<HTMLTableElement>(null)
  const setTable = useMergedRefs(tableRef, ref)
  const baseId = React.useId()
  const [sort, setSortState] = useControllable<DataTableSort | null>({
    value: controlledSort,
    defaultValue: () => defaultSort ?? null,
    onChange: onSortChange,
  })
  const [page, setPage] = useControllable<number>({ value: controlledPage, defaultValue: defaultPage, onChange: onPageChange })
  const [selection, setSelection] = useControllable<ReadonlySet<string>>({
    value: controlledSelection,
    defaultValue: () => new Set(defaultSelection ?? []),
    onChange: onSelectionChange as ((next: ReadonlySet<string>) => void) | undefined,
  })
  const [hidden, setHidden] = useControllable<ReadonlySet<string>>({
    value: controlledHidden,
    defaultValue: () => new Set(defaultHiddenColumns ?? []),
    onChange: onHiddenColumnsChange as ((next: ReadonlySet<string>) => void) | undefined,
  })
  const [widths, setWidths] = useControllable<Readonly<Record<string, number>>>({
    value: controlledWidths,
    defaultValue: () => ({ ...defaultColumnWidths }),
    onChange: onColumnWidthsChange as ((next: Readonly<Record<string, number>>) => void) | undefined,
  })
  const [expandedRows, setExpanded] = useControllable<ReadonlySet<string>>({
    value: controlledExpanded,
    defaultValue: () => new Set(defaultExpanded ?? []),
    onChange: onExpandedChange as ((next: ReadonlySet<string>) => void) | undefined,
  })

  const visibleColumns = columns.filter((c) => !hidden.has(c.key))
  const expandable = renderExpanded !== undefined
  // Stacked rows vary in height, and the window's arithmetic needs one height.
  const stack = stackWhenNarrow && !virtualize

  const sorted = React.useMemo(() => {
    if (manual || !sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column) return rows
    const value = (row: Row): SortValue =>
      column.sortValue ? column.sortValue(row) : ((row as Record<string, unknown>)[column.key] as SortValue)
    const sign = sort.direction === 'ascending' ? 1 : -1
    // Copy, never sort in place: `rows` belongs to the caller.
    return [...rows].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return compare(va, vb) * sign
    })
  }, [rows, columns, sort, manual])

  const total = manual ? (rowCount ?? rows.length) : rows.length
  const paginated = pageSize !== undefined && pageSize > 0
  const pageCount = paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1
  // A filter can shrink the data under the current page; show the last page
  // that exists rather than an empty table that says "page 9 of 3".
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  // Memoised, with the ids, so a virtual table's scroll re-render does not
  // slice and map ten thousand rows again.
  const pageRows = React.useMemo(
    () => (paginated && !manual ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted),
    [sorted, paginated, manual, currentPage, pageSize],
  )
  const ids = React.useMemo(() => pageRows.map(getRowId), [pageRows, getRowId])

  const virtual = useVirtualRows({
    enabled: virtualize && !loading && pageRows.length > 0,
    ids,
    expanded: expandable ? expandedRows : NO_ROWS,
    table: tableRef,
  })

  const toggleSort = (key: string) => {
    // ascending → descending → off. A third state matters: it is the only way
    // back to the order the data arrived in, which is often the meaningful one.
    const next: DataTableSort | null =
      sort?.key !== key
        ? { key, direction: 'ascending' }
        : sort.direction === 'ascending'
          ? { key, direction: 'descending' }
          : null
    setSortState(next)
    // A new order makes the old page number meaningless: page 4 of "newest
    // first" has nothing to do with page 4 of "most expensive".
    if (paginated && currentPage !== 1) setPage(1)
  }

  const selectedOnPage = ids.filter((id) => selection.has(id)).length
  const allSelected = ids.length > 0 && selectedOnPage === ids.length

  const toggleAll = () => {
    const next = new Set(selection)
    if (allSelected) ids.forEach((id) => next.delete(id))
    else ids.forEach((id) => next.add(id))
    setSelection(next)
  }

  const toggleRow = (id: string) => {
    const next = new Set(selection)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }

  const clearSelection = () => setSelection(new Set())

  const toggleColumn = (key: string, visible: boolean) => {
    const next = new Set(hidden)
    if (visible) next.delete(key)
    else next.add(key)
    setHidden(next)
  }

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  // ── column widths ──
  // The header cells' rendered widths, kept for `aria-valuenow` before the
  // first resize; the first resize itself measures again, in its handler.
  const headRefs = React.useRef(new Map<string, HTMLTableCellElement>())
  const [measured, setMeasured] = React.useState<Readonly<Record<string, number>>>({})
  const visibleKeys = visibleColumns.map((c) => c.key).join('\u0000')
  React.useLayoutEffect(() => {
    if (!resizableColumns) return
    const read = () => {
      const next: Record<string, number> = {}
      headRefs.current.forEach((th, key) => {
        next[key] = Math.round(th.getBoundingClientRect().width)
      })
      setMeasured((prev) => {
        const keys = Object.keys(next)
        return keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]) ? prev : next
      })
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    headRefs.current.forEach((th) => observer.observe(th))
    return () => observer.disconnect()
  }, [resizableColumns, visibleKeys])

  const lastColumn = visibleColumns.at(-1)
  const limits = (column: DataTableColumn<Row>) => ({
    min: column.minWidth ?? MIN_WIDTH,
    max: column.maxWidth ?? MAX_WIDTH,
  })
  const shownWidth = (column: DataTableColumn<Row>) => {
    const { min, max } = limits(column)
    return Math.min(max, Math.max(min, widths[column.key] ?? measured[column.key] ?? 0))
  }
  // For handlers only: reads the header cell as it is drawn now.
  const liveWidth = (key: string) =>
    widths[key] ?? Math.round(headRefs.current.get(key)?.getBoundingClientRect().width ?? measured[key] ?? 0)

  const resizeTo = (column: DataTableColumn<Row>, next: number) => {
    const { min, max } = limits(column)
    const width = Math.round(Math.min(max, Math.max(min, next)))
    // The first resize fixes every column but the last at the width it is
    // drawn at, and the table switches to a fixed layout. Without the
    // snapshot, the switch let the browser share the width out again and
    // every other column jumped the moment one was touched. The last column
    // keeps no width: it takes what is left, so dragging one edge moves
    // that edge and nothing else until the table runs out of room, and then
    // the table grows and the frame scrolls.
    const nextWidths: Record<string, number> = { ...widths }
    for (const c of visibleColumns.slice(0, -1)) nextWidths[c.key] ??= liveWidth(c.key)
    nextWidths[column.key] = width
    const unchanged = Object.keys(nextWidths).every((k) => widths[k] === nextWidths[k])
    if (!unchanged) setWidths(nextWidths)
  }

  const onResizeKey = (event: React.KeyboardEvent<HTMLElement>, column: DataTableColumn<Row>) => {
    const step = event.shiftKey ? STEP_LARGE : STEP
    // The handle sits on the column's trailing edge, so the arrow that
    // points away from the column widens it: right in left-to-right, left in
    // right-to-left. A table that kept "right is wider" in Arabic would move
    // the edge against the arrow.
    const outward = isRtl(event.currentTarget) ? -1 : 1
    const now = liveWidth(column.key)
    let next: number
    if (event.key === 'ArrowRight') next = now + step * outward
    else if (event.key === 'ArrowLeft') next = now - step * outward
    else if (event.key === 'Home') next = limits(column).min
    else if (event.key === 'End') next = limits(column).max
    else return
    // The focused frame would otherwise scroll on the same arrow.
    event.preventDefault()
    resizeTo(column, next)
  }

  const drag = React.useRef<{ key: string; x: number; width: number; mirrored: boolean } | null>(null)
  const startDrag = (event: React.PointerEvent<HTMLElement>, column: DataTableColumn<Row>) => {
    if (event.button !== 0) return
    event.preventDefault()
    // Captured, so the drag keeps going when the pointer outruns the handle.
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { key: column.key, x: event.clientX, width: liveWidth(column.key), mirrored: isRtl(event.currentTarget) }
  }
  const moveDrag = (event: React.PointerEvent<HTMLElement>, column: DataTableColumn<Row>) => {
    const d = drag.current
    if (!d || d.key !== column.key) return
    resizeTo(column, d.width + (event.clientX - d.x) * (d.mirrored ? -1 : 1))
  }
  const endDrag = () => {
    drag.current = null
  }

  const fixedLayout = resizableColumns && Object.keys(widths).length > 0
  const leadCount = (selectable ? 1 : 0) + (expandable ? 1 : 0)
  // At least the fixed columns plus the last one's minimum: wider than the
  // frame, the table grows and the frame scrolls; narrower, the last
  // column takes the rest.
  const fixedSum = visibleColumns.slice(0, -1).reduce((sum, c) => sum + (widths[c.key] ?? 0), 0)
  const tableStyle = fixedLayout
    ? ({
        ...style,
        '--data-table-w': `max(100%, calc(${fixedSum + (lastColumn ? limits(lastColumn).min : 0)}px + ${leadCount * 2.75}rem))`,
      } as React.CSSProperties)
    : style

  const colWidth = (column: DataTableColumn<Row>) => {
    if (!fixedLayout) return column.width
    if (column === lastColumn) return undefined
    const px = widths[column.key]
    return px !== undefined ? `${px}px` : column.width
  }

  const resizer = (column: DataTableColumn<Row>) => {
    if (!resizableColumns || column === lastColumn || column.resizable === false) return undefined
    const { min, max } = limits(column)
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={f.format(t.resize, { name: columnName(column) })}
        aria-valuenow={shownWidth(column)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        data-part="resizer"
        onKeyDown={(event) => onResizeKey(event, column)}
        onPointerDown={(event) => startDrag(event, column)}
        onPointerMove={(event) => moveDrag(event, column)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'group/resize absolute inset-y-0 end-0 z-(--z-lift) w-3 cursor-col-resize touch-none select-none outline-none',
          // Inset: the header row is the top of a scrolling frame, which
          // clipped an outer ring to its lower half.
          'focus-visible:focus-ring-inset',
          stack && STACK.hidden,
        )}
      >
        {/* The grip: ink-muted at rest, which clears 3:1 against the header
            ground, so the handle can be found without hovering; ink while
            pointed at or focused. A drag captures the pointer, so the
            handle stays hovered for the length of it. */}
        <span
          aria-hidden
          className="absolute inset-y-2 end-0 w-0.5 bg-ink-muted transition-colors group-hover/resize:bg-ink group-focus-visible/resize:bg-ink"
        />
      </div>
    )
  }

  const columnCount = visibleColumns.length + leadCount
  const selectedCount = selection.size
  const nounFor = (n: number) => f.plural(noun, n)

  const emptyProps: DataTableEmpty = isEmptyData(empty)
    ? empty
    : { title: t.empty, description: empty as React.ReactNode }

  // ── frozen columns ──
  const frozenGround = framed ? 'bg-cloth-pale' : 'bg-cloth'
  // Three things overlap at the frozen corner of a sticky header: the frozen
  // header cells, the header cells scrolling sideways under them, and the
  // frozen body cells scrolling up under them. Same-level cells paint in DOM
  // order, so the header cells that come later would cover the corner; the
  // corner keeps `--z-sticky` and the rest of a sticky header drops to
  // `--z-lift`, with the frozen body cells. Nothing else overlaps: the frozen
  // body cells only ever pass under the corner. (One step above the scale,
  // `calc(var(--z-sticky) + 1)`, did the same with a value off it.)
  const frozenHead = cn('sticky', stickyHeader ? 'z-(--z-sticky)' : 'z-(--z-lift)', stack && STACK.unfreeze)
  const frozenBody = cn('sticky z-(--z-lift)', frozenGround, stack && STACK.unfreeze)
  // The insets assume the checkbox and disclosure columns are 2.75rem. A
  // table squeezed to its content shrank them to the checkbox's own width,
  // and the columns scrolling past showed through the gap before the frozen
  // id, so they are held at that width, not only asked for it.
  const frozenLead = 'min-w-11'
  const selectInset = FROZEN_INSET[0]
  const expandInset = FROZEN_INSET[selectable ? 1 : 0]
  const firstInset = FROZEN_INSET[leadCount]
  const firstKey = visibleColumns[0]?.key
  const role = (r: string) => (stack ? r : undefined)

  const renderRow = (row: Row, index: number) => {
    const id = ids[index] as string
    const isSelected = selection.has(id)
    const canOpen = expandable && (canExpand ? canExpand(row) : true)
    const isOpen = canOpen && expandedRows.has(id)
    // An IDREF list is whitespace-separated, so an id with a space in it
    // would point `aria-controls` at two elements that do not exist.
    const detailId = `${baseId}-detail-${id.replace(/\s+/g, '_')}`
    const rowIndex = virtual?.rowIndex(index)
    const out = [
      <TableRow
        key={id}
        role={role('row')}
        aria-rowindex={rowIndex}
        data-row-id={virtual ? id : undefined}
        data-expanded={isOpen || undefined}
        selected={selectable && isSelected}
        className={cn(stack && STACK.row)}
      >
        {selectable ? (
          <TableCell role={role('cell')} className={cn('w-11 pe-0', stickyFirstColumn && [frozenBody, frozenLead, selectInset], stack && STACK.lead)}>
            <TableCheckbox
              aria-label={rowLabel ? rowLabel(row) : f.format(t.selectRow, { id })}
              checked={isSelected}
              onChange={() => toggleRow(id)}
            />
          </TableCell>
        ) : null}
        {expandable ? (
          <TableCell role={role('cell')} className={cn('w-11 pe-0', stickyFirstColumn && [frozenBody, frozenLead, expandInset], stack && STACK.lead)}>
            {canOpen ? (
              // A native button with `aria-expanded` and `aria-controls` is
              // the whole disclosure pattern. Base UI's Collapsible would need
              // the panel inside its root, and the panel here is the next
              // `<tr>`, which no wrapper element may sit around.
              <IconButton
                variant="ghost"
                size="sm"
                label={expandLabel ? expandLabel(row) : f.format(t.detailsOf, { id })}
                aria-expanded={isOpen}
                aria-controls={isOpen ? detailId : undefined}
                onClick={() => toggleExpanded(id)}
                className="group/expand"
              >
                {/* The one disclosure marker (ADR 0006): a plus that turns
                    into a cross. */}
                <Plus className="transition-transform duration-(--motion-base) group-aria-expanded/expand:rotate-45" />
              </IconButton>
            ) : null}
          </TableCell>
        ) : null}
        {visibleColumns.map((column) => {
          const content = column.cell ? column.cell(row) : String((row as Record<string, unknown>)[column.key] ?? '')
          const first = stickyFirstColumn && column.key === firstKey
          return (
            <TableCell
              key={column.key}
              role={role('cell')}
              numeric={column.align === 'end'}
              truncate={column.truncate}
              title={column.truncate && typeof content === 'string' ? content : undefined}
              className={cn(first && [frozenBody, firstInset, 'cut-e'], stack && STACK.cell)}
            >
              {stack ? (
                <span aria-hidden className={STACK.label}>
                  {columnName(column)}
                </span>
              ) : null}
              {content}
            </TableCell>
          )
        })}
      </TableRow>,
    ]
    if (isOpen && renderExpanded) {
      out.push(
        <tr
          key={`${id}\u0000detail`}
          id={detailId}
          role={role('row')}
          aria-rowindex={rowIndex === undefined ? undefined : rowIndex + 1}
          data-slot="data-table-detail"
          data-part="detail"
          data-detail-for={virtual ? id : undefined}
          className={cn(stack && STACK.detail)}
        >
          <td colSpan={columnCount} role={role('cell')} className={cn('bg-cloth-shade py-3 pe-3 rule-b-soft', DETAIL_INSET[leadCount], stack && [STACK.detail, '@max-xl/data-table:ps-3'])}>
            {renderExpanded(row)}
          </td>
        </tr>,
      )
    }
    return out
  }

  const spacer = (key: string, height: number) =>
    height > 0 ? (
      <tr key={key} aria-hidden data-slot="data-table-spacer">
        <td colSpan={columnCount} className="p-0" style={{ height }} />
      </tr>
    ) : null

  let body: React.ReactNode
  if (loading) {
    body = <TableSkeletonRows columns={columnCount} rows={Math.min(pageSize ?? 6, 10)} />
  } else if (pageRows.length === 0) {
    body = (
      <TableEmpty
        colSpan={columnCount}
        role={role('row')}
        title={emptyProps.title}
        kind={emptyProps.kind}
        variant={emptyProps.variant}
        actions={emptyProps.actions}
      >
        {emptyProps.description}
      </TableEmpty>
    )
  } else if (virtual) {
    const out: React.ReactNode[] = []
    let next = 0
    virtual.indexes.forEach((index, n) => {
      if (index > next) out.push(spacer(`gap-${n}`, virtual.top(index) - virtual.top(next)))
      out.push(...renderRow(pageRows[index] as Row, index))
      next = index + 1
    })
    if (next < pageRows.length) out.push(spacer('gap-end', virtual.total - virtual.top(next)))
    body = out
  } else {
    body = pageRows.flatMap((row, index) => renderRow(row, index))
  }

  const table = (
    <Table
      {...props}
      ref={setTable}
      role={role('table')}
      aria-label={label}
      aria-busy={loading || undefined}
      aria-rowcount={virtual?.rowCount}
      stickyHeader={stickyHeader}
      framed={framed}
      // The sticky header would cover a row the browser scrolls to on focus;
      // the padding keeps a focused row in sight below it.
      frameClassName={cn(stickyHeader && 'scroll-pt-(--row-h)', frameClassName)}
      style={tableStyle}
      className={cn(fixedLayout && 'table-fixed w-(--data-table-w)', stack && STACK.table, className)}
    >
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <colgroup>
        {selectable ? <col style={{ width: '2.75rem' }} /> : null}
        {expandable ? <col style={{ width: '2.75rem' }} /> : null}
        {visibleColumns.map((column) => {
          const width = colWidth(column)
          return <col key={column.key} style={width ? { width } : undefined} />
        })}
      </colgroup>
      <TableHeader role={role('rowgroup')} className={cn(stack && STACK.head)}>
        <TableRow
          role={role('row')}
          aria-rowindex={virtual ? 1 : undefined}
          className={cn('hover:[&>td]:bg-transparent', stack && STACK.headRow)}
        >
          {selectable ? (
            <TableHead
              role={role('columnheader')}
              className={cn('w-11 pe-0', stickyFirstColumn && [frozenHead, frozenLead, selectInset], stack && STACK.headCell)}
            >
              <TableCheckbox
                aria-label={
                  allSelected
                    ? paginated
                      ? t.deselectAllOnPage
                      : t.deselectAll
                    : paginated
                      ? t.selectAllOnPage
                      : t.selectAll
                }
                checked={allSelected}
                indeterminate={selectedOnPage > 0 && !allSelected}
                onChange={toggleAll}
                disabled={loading || ids.length === 0}
              />
            </TableHead>
          ) : null}
          {expandable ? (
            <TableHead
              role={role('columnheader')}
              className={cn('w-11 pe-0', stickyFirstColumn && [frozenHead, frozenLead, expandInset], stack && [STACK.headCell, '@max-xl/data-table:sr-only'])}
            >
              <span className="sr-only">{t.details}</span>
            </TableHead>
          ) : null}
          {visibleColumns.map((column) => {
            const first = stickyFirstColumn && column.key === firstKey
            const handle = resizer(column)
            return (
              <TableHead
                key={column.key}
                // A header's name is computed from its content, and the
                // handle's own name is part of that content: every cell in
                // the column was announced as "Agent Resize Agent". Named
                // outright, the header is "Agent" again.
                aria-label={handle ? columnName(column) : undefined}
                ref={(el) => {
                  if (el) headRefs.current.set(column.key, el)
                  else headRefs.current.delete(column.key)
                }}
                role={role('columnheader')}
                numeric={column.align === 'end'}
                sort={
                  column.sortable
                    ? sort?.key === column.key
                      ? sort.direction
                      : 'none'
                    : undefined
                }
                onSort={column.sortable ? () => toggleSort(column.key) : undefined}
                resizer={handle}
                className={cn(
                  // The handle needs a positioned header; a sticky one already
                  // is. Isolated, so a handle scrolled under the frozen
                  // column stays under it rather than painting over it.
                  resizableColumns && !stickyHeader && !first && 'relative isolate',
                  stickyFirstColumn && stickyHeader && !first && 'z-(--z-lift)',
                  first && [frozenHead, firstInset, 'cut-e'],
                  stack && STACK.headCell,
                  // In the stacked bar a label with nothing to press is read,
                  // not shown: each cell now shows its own.
                  stack && !column.sortable && '@max-xl/data-table:sr-only',
                )}
              >
                {column.header}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody
        role={role('rowgroup')}
        className={cn(stack && STACK.body)}
        onFocus={
          virtual
            ? (event) => {
                const tr = (event.target as HTMLElement).closest<HTMLElement>('tr[data-row-id], tr[data-detail-for]')
                const id = tr?.dataset.rowId ?? tr?.dataset.detailFor
                if (id !== undefined) virtual.pin(id)
              }
            : undefined
        }
        onBlur={
          virtual
            ? (event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) virtual.pin(null)
              }
            : undefined
        }
      >
        {body}
      </TableBody>
    </Table>
  )

  // One announcement per change, from one place. The visible count in the bar
  // is not live, so a screen reader hears the change once rather than twice.
  const status = selectable ? (
    <p role="status" className="sr-only">
      {selectedCount > 0
        ? f.format(t.selectedOf, { selected: fmt(selectedCount), total: fmt(total), noun: nounFor(total) })
        : f.format(t.noneSelected, { noun: noun.other })}
    </p>
  ) : null

  const hasBar = columnMenu || bulkActions !== undefined
  // Without a bar or pager the table renders exactly as it always has — no
  // wrapper — so existing layouts that size the table directly do not change.
  if (!hasBar && !paginated && !stack) {
    return (
      <>
        {table}
        {status}
      </>
    )
  }

  const showBulk = bulkActions !== undefined && selectedCount > 0

  return (
    <div data-slot="data-table" className={cn('flex min-w-0 flex-col gap-2', stack && '@container/data-table', wrapperClassName)}>
      {hasBar ? (
        // A fixed height, so the bar trading its count for the bulk actions
        // never pushes the table down under the pointer.
        <div className="flex h-(--control-h) items-center gap-3">
          {showBulk ? (
            <div
              data-slot="data-table-bulk"
              className="flex h-full min-w-0 flex-1 items-center gap-2 bg-selected ps-3 pe-1 bar-start-ink forced-selected"
            >
              {/* `dir="auto"`: a count that opens with a digit is otherwise
                  reordered in a right-to-left page, "runs selected 3". */}
              <span dir="auto" className="shrink-0 text-sm tabular-nums text-ink">
                {f.nodes(t.selected, { count: <span className="font-semibold">{fmt(selectedCount)}</span>, noun: nounFor(selectedCount) })}
              </span>
              <Button variant="ghost" size="sm" icon={<X />} onClick={clearSelection}>
                {t.clear}
              </Button>
              {/* On a narrow screen the actions scroll inside the bar rather
                  than wrapping it: the bar's height is the promise that the
                  table does not move. A scroller clips whatever paints
                  outside its children, and the cut is a box-shadow: with no
                  inline padding the first action lost its leading keyline and
                  the last its trailing one, so the outer buttons read as
                  blocks with an edge missing. `p-0.5` is room for the 1.5px
                  cut. The focus ring is 6.5px and the bar has 4px above and
                  below its buttons, so here it is drawn inside the button,
                  under the kept cut, rather than clipped to a sliver. */}
              <div ref={bulkEdge} className="scroll-cloth scroll-edge ms-auto flex min-w-0 items-center gap-1.5 overflow-x-auto p-0.5 [&>*]:shrink-0 [&>*]:focus-visible:cut-ink [&>*]:focus-visible:focus-ring-inset">
                {bulkActions({ selection: new Set(selection), clear: clearSelection })}
              </div>
            </div>
          ) : (
            <p className="m-0 min-w-0 flex-1 text-sm tabular-nums text-ink-2">
              {loading
                ? t.loading
                : f.nodes(t.total, { count: <span className="font-semibold text-ink">{fmt(total)}</span>, noun: nounFor(total) })}
            </p>
          )}
          {columnMenu ? (
            <DataTableColumnMenu columns={columns} hidden={hidden} onToggle={toggleColumn} messages={messages} />
          ) : null}
        </div>
      ) : null}
      {table}
      {paginated && total > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          {paginationVariant === 'pages' ? (
            // The compact pager says its range itself; the numbered one only
            // says where you are, so the range goes beside it.
            <p dir="auto" className="m-0 me-auto text-sm tabular-nums text-ink-2">
              {f.nodes(t.rangeOf, {
                range: (
                  <span className="font-semibold text-ink">
                    {fmt((currentPage - 1) * pageSize + 1)}–{fmt(Math.min(currentPage * pageSize, total))}
                  </span>
                ),
                total: fmt(total),
                noun: nounFor(total),
              })}
            </p>
          ) : null}
          <Pagination
            aria-label={label ? f.format(t.labelledPages, { label }) : t.pages}
            variant={paginationVariant}
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </div>
      ) : null}
      {status}
    </div>
  )
}

export interface DataTableColumnMenuProps<Row> extends Omit<React.ComponentProps<'button'>, 'children' | 'onToggle' | 'hidden'> {
  /**
   * Every column, hidden or not, so the menu can list them all. A column with
   * `hideable: false` shows checked and disabled.
   */
  columns: DataTableColumn<Row>[]
  /**
   * The keys of the columns currently hidden. The last visible column cannot be
   * hidden.
   */
  hidden: ReadonlySet<string>
  /**
   * Called with a column's key and whether it should now be visible. The menu
   * stays open, because columns are chosen several at a time.
   */
  onToggle: (key: string, visible: boolean) => void
  /** Words for translation: the button and the menu's heading. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<DataTableMessages>
}

/**
 * Which columns show. Toggling does not close the menu, because columns are
 * chosen several at a time. The last visible column cannot be hidden — a
 * table with no columns is not a state worth being able to reach — and a
 * column marked `hideable: false` is shown checked and disabled, so the menu
 * still says it exists.
 */
/** `className`, `ref` and the rest of the DOM props go to the "Columns" button. */
export function DataTableColumnMenu<Row>({ columns, hidden, onToggle, messages, ...props }: DataTableColumnMenuProps<Row>) {
  const [t] = useMessages('dataTable', dataTableMessages, messages)
  const visibleCount = columns.filter((c) => !hidden.has(c.key)).length
  return (
    <Menu>
      <MenuTrigger render={<Button {...props} variant="secondary" size="sm" icon={<Columns3 />} />}>
        {t.columns}
      </MenuTrigger>
      <MenuContent align="end">
        <MenuGroup>
          <MenuGroupLabel>{t.showColumns}</MenuGroupLabel>
          {columns.map((column) => {
            const visible = !hidden.has(column.key)
            const name = columnName(column)
            return (
              <MenuCheckboxItem
                key={column.key}
                checked={visible}
                disabled={column.hideable === false || (visible && visibleCount === 1)}
                onCheckedChange={(checked) => onToggle(column.key, checked)}
              >
                {name}
              </MenuCheckboxItem>
            )
          })}
        </MenuGroup>
      </MenuContent>
    </Menu>
  )
}
