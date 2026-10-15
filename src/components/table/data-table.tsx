'use client'

import { Columns3, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useScrollEdge } from '../../lib/scroll-edge'
import { useControllable } from '../../lib/use-controllable'
import { Button } from '../button'
import type { EmptyStateProps } from '../empty-state'
import { Menu, MenuCheckboxItem, MenuContent, MenuGroup, MenuGroupLabel, MenuTrigger } from '../menu'
import { Pagination } from '../pagination'
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
 * for anything this does not cover, including virtualization (see the
 * "Virtualized" story).
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
  /** What a row is, for counts: `{ one: 'run', other: 'runs' }`. */
  noun?: { one: string; other: string }

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
}

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

const fmt = (n: number) => n.toLocaleString('en-US')

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  label,
  caption,
  noun = { one: 'row', other: 'rows' },
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
  className,
  ...props
}: DataTableProps<Row>) {
  const bulkEdge = useScrollEdge<HTMLDivElement>()
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

  const visibleColumns = columns.filter((c) => !hidden.has(c.key))

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
  const pageRows = paginated && !manual ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted

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

  const ids = pageRows.map(getRowId)
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

  const columnCount = visibleColumns.length + (selectable ? 1 : 0)
  const selectedCount = selection.size
  const nounFor = (n: number) => (n === 1 ? noun.one : noun.other)

  const emptyProps: DataTableEmpty = isEmptyData(empty)
    ? empty
    : { title: 'Nothing here yet', description: empty as React.ReactNode }

  const table = (
    <Table
      {...props}
      aria-label={label}
      aria-busy={loading || undefined}
      stickyHeader={stickyHeader}
      framed={framed}
      frameClassName={frameClassName}
      className={className}
    >
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <colgroup>
        {selectable ? <col style={{ width: '2.75rem' }} /> : null}
        {visibleColumns.map((column) => (
          <col key={column.key} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow className="hover:[&>td]:bg-transparent">
          {selectable ? (
            <TableHead className="w-11 pe-0">
              <TableCheckbox
                aria-label={
                  allSelected
                    ? paginated
                      ? 'Deselect all rows on this page'
                      : 'Deselect all rows'
                    : paginated
                      ? 'Select all rows on this page'
                      : 'Select all rows'
                }
                checked={allSelected}
                indeterminate={selectedOnPage > 0 && !allSelected}
                onChange={toggleAll}
                disabled={loading || ids.length === 0}
              />
            </TableHead>
          ) : null}
          {visibleColumns.map((column) => (
            <TableHead
              key={column.key}
              numeric={column.align === 'end'}
              sort={
                column.sortable
                  ? sort?.key === column.key
                    ? sort.direction
                    : 'none'
                  : undefined
              }
              onSort={column.sortable ? () => toggleSort(column.key) : undefined}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableSkeletonRows columns={columnCount} rows={Math.min(pageSize ?? 6, 10)} />
        ) : pageRows.length === 0 ? (
          <TableEmpty
            colSpan={columnCount}
            title={emptyProps.title}
            kind={emptyProps.kind}
            variant={emptyProps.variant}
            actions={emptyProps.actions}
          >
            {emptyProps.description}
          </TableEmpty>
        ) : (
          pageRows.map((row) => {
            const id = getRowId(row)
            const isSelected = selection.has(id)
            return (
              <TableRow key={id} selected={selectable && isSelected}>
                {selectable ? (
                  <TableCell className="w-11 pe-0">
                    <TableCheckbox
                      aria-label={rowLabel ? rowLabel(row) : `Select row ${id}`}
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                    />
                  </TableCell>
                ) : null}
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} numeric={column.align === 'end'} truncate={column.truncate}>
                    {column.cell
                      ? column.cell(row)
                      : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )

  // One announcement per change, from one place. The visible count in the bar
  // is not live, so a screen reader hears the change once rather than twice.
  const status = selectable ? (
    <p role="status" className="sr-only">
      {selectedCount > 0
        ? `${fmt(selectedCount)} of ${fmt(total)} ${nounFor(total)} selected`
        : `No ${noun.other} selected`}
    </p>
  ) : null

  const hasBar = columnMenu || bulkActions !== undefined
  // Without a bar or pager the table renders exactly as it always has — no
  // wrapper — so existing layouts that size the table directly do not change.
  if (!hasBar && !paginated) {
    return (
      <>
        {table}
        {status}
      </>
    )
  }

  const showBulk = bulkActions !== undefined && selectedCount > 0

  return (
    <div data-slot="data-table" className={cn('flex min-w-0 flex-col gap-2', wrapperClassName)}>
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
                <span className="font-semibold">{fmt(selectedCount)}</span> {nounFor(selectedCount)} selected
              </span>
              <Button variant="ghost" size="sm" icon={<X />} onClick={clearSelection}>
                Clear
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
              {loading ? (
                'Loading…'
              ) : (
                <>
                  <span className="font-semibold text-ink">{fmt(total)}</span> {nounFor(total)}
                </>
              )}
            </p>
          )}
          {columnMenu ? (
            <DataTableColumnMenu columns={columns} hidden={hidden} onToggle={toggleColumn} />
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
              <span className="font-semibold text-ink">
                {fmt((currentPage - 1) * pageSize + 1)}–{fmt(Math.min(currentPage * pageSize, total))}
              </span>{' '}
              of {fmt(total)} {nounFor(total)}
            </p>
          ) : null}
          <Pagination
            aria-label={label ? `${label} pages` : 'Pages'}
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
}

/**
 * Which columns show. Toggling does not close the menu, because columns are
 * chosen several at a time. The last visible column cannot be hidden — a
 * table with no columns is not a state worth being able to reach — and a
 * column marked `hideable: false` is shown checked and disabled, so the menu
 * still says it exists.
 */
/** `className`, `ref` and the rest of the DOM props go to the "Columns" button. */
export function DataTableColumnMenu<Row>({ columns, hidden, onToggle, ...props }: DataTableColumnMenuProps<Row>) {
  const visibleCount = columns.filter((c) => !hidden.has(c.key)).length
  return (
    <Menu>
      <MenuTrigger render={<Button {...props} variant="secondary" size="sm" icon={<Columns3 />} />}>
        Columns
      </MenuTrigger>
      <MenuContent align="end">
        <MenuGroup>
          <MenuGroupLabel>Show columns</MenuGroupLabel>
          {columns.map((column) => {
            const visible = !hidden.has(column.key)
            const name = column.label ?? (typeof column.header === 'string' ? column.header : column.key)
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
