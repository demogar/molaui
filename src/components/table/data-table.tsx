'use client'

import { Columns3, X } from 'lucide-react'
import * as React from 'react'

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
export type DataTableEmpty = Pick<EmptyStateProps, 'title' | 'description' | 'actions' | 'variant'>

export interface DataTableBulkContext {
  /** The selected row ids, across every page. */
  selection: Set<string>
  /** Empties the selection. */
  clear: () => void
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  /** Names the table for assistive tech when there is no visible caption. */
  label?: string
  caption?: React.ReactNode
  /** What a row is, for counts: `{ one: 'run', other: 'runs' }`. */
  noun?: { one: string; other: string }

  /** Sorting and paging are done by the server: rows are one page, already sorted. */
  manual?: boolean

  /** Controlled sort. `null` is "no sort"; leave undefined to let the table own it. */
  sort?: DataTableSort | null
  defaultSort?: DataTableSort
  onSortChange?: (sort: DataTableSort | null) => void

  /** Rows per page. Setting it turns pagination on. */
  pageSize?: number
  /** Controlled page, 1-based. */
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  /** The total across every page, when `manual`. */
  rowCount?: number
  paginationVariant?: 'compact' | 'pages'

  selectable?: boolean
  /** Controlled selection. Pair with `onSelectionChange`. */
  selection?: ReadonlySet<string>
  defaultSelection?: Iterable<string>
  onSelectionChange?: (selection: Set<string>) => void
  /** How a row checkbox is named, e.g. `(run) => \`Select ${run.id}\``. */
  rowLabel?: (row: Row) => string
  /** Actions for the selected rows, shown in the bar above the table while any are selected. */
  bulkActions?: (context: DataTableBulkContext) => React.ReactNode

  /** Adds a "Columns" menu to the bar above the table. */
  columnMenu?: boolean
  /** Controlled hidden columns, by key. */
  hiddenColumns?: ReadonlySet<string>
  defaultHiddenColumns?: Iterable<string>
  onHiddenColumnsChange?: (hidden: Set<string>) => void

  loading?: boolean
  empty?: React.ReactNode | DataTableEmpty
  stickyHeader?: boolean
  framed?: boolean
  frameClassName?: string
  className?: string
}

function compare(a: SortValue, b: SortValue): number {
  // Missing values sort last in both directions; that is handled by the caller
  // flipping only the non-null comparison.
  if (a instanceof Date) a = a.getTime()
  if (b instanceof Date) b = b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/** Controlled when `value` is defined, otherwise owned here — the one pattern every prop pair uses. */
function useControllable<T>(value: T | undefined, initial: () => T, onChange?: (next: T) => void) {
  const [own, setOwn] = React.useState<T>(initial)
  const current = value !== undefined ? value : own
  const set = (next: T) => {
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  return [current, set] as const
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
  className,
}: DataTableProps<Row>) {
  const [sort, setSortState] = useControllable<DataTableSort | null>(controlledSort, () => defaultSort ?? null, onSortChange)
  const [page, setPage] = useControllable<number>(controlledPage, () => defaultPage, onPageChange)
  const [selection, setSelection] = useControllable<ReadonlySet<string>>(
    controlledSelection,
    () => new Set(defaultSelection ?? []),
    onSelectionChange as ((next: ReadonlySet<string>) => void) | undefined,
  )
  const [hidden, setHidden] = useControllable<ReadonlySet<string>>(
    controlledHidden,
    () => new Set(defaultHiddenColumns ?? []),
    onHiddenColumnsChange as ((next: ReadonlySet<string>) => void) | undefined,
  )

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
    <div data-slot="data-table" className="flex min-w-0 flex-col gap-2">
      {hasBar ? (
        // A fixed height, so the bar trading its count for the bulk actions
        // never pushes the table down under the pointer.
        <div className="flex h-(--control-h) items-center gap-3">
          {showBulk ? (
            <div
              data-slot="data-table-bulk"
              className="flex h-full min-w-0 flex-1 items-center gap-2 bg-oro-soft ps-3 pe-1 shadow-[inset_3px_0_0_var(--ink)] rtl:shadow-[inset_-3px_0_0_var(--ink)] forced-selected"
            >
              <span className="shrink-0 text-sm tabular-nums text-ink">
                <span className="font-semibold">{fmt(selectedCount)}</span> {nounFor(selectedCount)} selected
              </span>
              <Button variant="ghost" size="sm" icon={<X />} onClick={clearSelection}>
                Clear
              </Button>
              <div className="ms-auto flex min-w-0 items-center gap-1.5">
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
            <p className="m-0 me-auto text-sm tabular-nums text-ink-2">
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

export interface DataTableColumnMenuProps<Row> {
  columns: DataTableColumn<Row>[]
  hidden: ReadonlySet<string>
  onToggle: (key: string, visible: boolean) => void
  className?: string
}

/**
 * Which columns show. Toggling does not close the menu, because columns are
 * chosen several at a time. The last visible column cannot be hidden — a
 * table with no columns is not a state worth being able to reach — and a
 * column marked `hideable: false` is shown checked and disabled, so the menu
 * still says it exists.
 */
export function DataTableColumnMenu<Row>({ columns, hidden, onToggle, className }: DataTableColumnMenuProps<Row>) {
  const visibleCount = columns.filter((c) => !hidden.has(c.key)).length
  return (
    <Menu>
      <MenuTrigger render={<Button variant="secondary" size="sm" icon={<Columns3 />} className={className} />}>
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
