import type { PluralMessage } from '../../lib/messages'

/** The words Table's parts say on their own. */
export interface TableMessages {
  /** TableEmpty's heading, when `title` is not set. */
  empty: string
}

export const tableMessages: TableMessages = {
  empty: 'Nothing here yet',
}

/**
 * The words DataTable and DataTableColumnMenu say on their own. `{noun}` is
 * the `noun` prop (or `noun` here) in the plural category of the count
 * beside it.
 */
export interface DataTableMessages {
  /** What a row is, when the `noun` prop is not set. */
  noun: PluralMessage
  /** The empty state's heading, when `empty` gives none. */
  empty: string
  /** The header checkbox, unpaginated, while some rows are unselected. */
  selectAll: string
  /** The header checkbox, unpaginated, while every row is selected. */
  deselectAll: string
  /** The header checkbox, paginated, while some rows on the page are unselected. */
  selectAllOnPage: string
  /** The header checkbox, paginated, while every row on the page is selected. */
  deselectAllOnPage: string
  /** A row's checkbox, when `rowLabel` is not set. `{id}` is the row's id. */
  selectRow: string
  /** Announced as the selection changes. `{selected}` and `{total}` are counts. */
  selectedOf: string
  /** Announced when the selection is emptied. `{noun}` is the plural. */
  noneSelected: string
  /** The bulk bar's count. `{count}` is set in bold. */
  selected: string
  /** The bulk bar's button that empties the selection. */
  clear: string
  /** The bar's text while rows load. */
  loading: string
  /** The bar's count of rows. `{count}` is set in bold. */
  total: string
  /** Beside the numbered pager. `{range}` is the bold "26–50", `{total}` the row count. */
  rangeOf: string
  /** The pager's landmark name without a `label`. */
  pages: string
  /** The pager's landmark name with a `label`. `{label}` is the table's label. */
  labelledPages: string
  /** A column's resize handle. `{name}` is the column's name. */
  resize: string
  /** The disclosure column's hidden header. */
  details: string
  /** A row's disclosure button, when `expandLabel` is not set. `{id}` is the row's id. */
  detailsOf: string
  /** DataTableColumnMenu's button. */
  columns: string
  /** The heading inside the column menu. */
  showColumns: string
}

export const dataTableMessages: DataTableMessages = {
  noun: { one: 'row', other: 'rows' },
  empty: 'Nothing here yet',
  selectAll: 'Select all rows',
  deselectAll: 'Deselect all rows',
  selectAllOnPage: 'Select all rows on this page',
  deselectAllOnPage: 'Deselect all rows on this page',
  selectRow: 'Select row {id}',
  selectedOf: '{selected} of {total} {noun} selected',
  noneSelected: 'No {noun} selected',
  selected: '{count} {noun} selected',
  clear: 'Clear',
  loading: 'Loading…',
  total: '{count} {noun}',
  rangeOf: '{range} of {total} {noun}',
  pages: 'Pages',
  labelledPages: '{label} pages',
  resize: 'Resize {name}',
  details: 'Details',
  detailsOf: 'Details of row {id}',
  columns: 'Columns',
  showColumns: 'Show columns',
}
