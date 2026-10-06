'use client'

import * as React from 'react'

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
 * The convenience layer over the primitives: columns as data, client-side
 * sorting, row selection. It deliberately stops there. Pagination, filtering
 * and server sorting belong to whatever owns the data — the moment a table
 * component fetches, every screen that uses it inherits one opinion about
 * caching. The primitives remain the escape hatch for anything this does not
 * cover.
 */

export type SortValue = string | number | Date | null | undefined

export interface DataTableColumn<Row> {
  key: string
  header: React.ReactNode
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
}

export interface DataTableSort {
  key: string
  direction: 'ascending' | 'descending'
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  /** Names the table for assistive tech when there is no visible caption. */
  label?: string
  caption?: React.ReactNode
  defaultSort?: DataTableSort
  selectable?: boolean
  /** Controlled selection. Pair with `onSelectionChange`. */
  selection?: ReadonlySet<string>
  defaultSelection?: Iterable<string>
  onSelectionChange?: (selection: Set<string>) => void
  /** How a row checkbox is named, e.g. `(run) => \`Select ${run.id}\``. */
  rowLabel?: (row: Row) => string
  loading?: boolean
  empty?: React.ReactNode
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

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  label,
  caption,
  defaultSort,
  selectable = false,
  selection: controlledSelection,
  defaultSelection,
  onSelectionChange,
  rowLabel,
  loading = false,
  empty,
  stickyHeader = false,
  framed = false,
  frameClassName,
  className,
}: DataTableProps<Row>) {
  const [sort, setSort] = React.useState<DataTableSort | undefined>(defaultSort)
  const [ownSelection, setOwnSelection] = React.useState<Set<string>>(
    () => new Set(defaultSelection ?? []),
  )
  const selection = controlledSelection ?? ownSelection

  const setSelection = (next: Set<string>) => {
    if (controlledSelection === undefined) setOwnSelection(next)
    onSelectionChange?.(next)
  }

  const sorted = React.useMemo(() => {
    if (!sort) return rows
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
  }, [rows, columns, sort])

  const toggleSort = (key: string) => {
    // ascending → descending → off. A third state matters: it is the only way
    // back to the order the data arrived in, which is often the meaningful one.
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'ascending' }
      if (current.direction === 'ascending') return { key, direction: 'descending' }
      return undefined
    })
  }

  const ids = sorted.map(getRowId)
  const selectedCount = ids.filter((id) => selection.has(id)).length
  const allSelected = ids.length > 0 && selectedCount === ids.length

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

  const columnCount = columns.length + (selectable ? 1 : 0)

  return (
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
        {columns.map((column) => (
          <col key={column.key} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow className="hover:[&>td]:bg-transparent">
          {selectable ? (
            <TableHead className="w-11 pe-0">
              <TableCheckbox
                aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                checked={allSelected}
                indeterminate={selectedCount > 0 && !allSelected}
                onChange={toggleAll}
                disabled={loading || ids.length === 0}
              />
            </TableHead>
          ) : null}
          {columns.map((column) => (
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
          <TableSkeletonRows columns={columnCount} rows={6} />
        ) : sorted.length === 0 ? (
          <TableEmpty colSpan={columnCount}>{empty}</TableEmpty>
        ) : (
          sorted.map((row) => {
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
                {columns.map((column) => (
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
}
