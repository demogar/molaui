/** The words Pagination says on its own. */
export interface PaginationMessages {
  /** Names the `nav` landmark, when `aria-label` is not set. */
  label: string
  /** The previous-page button. */
  previous: string
  /** The next-page button. */
  next: string
  /** A page number button's name. `{page}` is the number. */
  page: string
  /** The compact variant with rows: "51–100 of 1,284". `{range}` is the bold "51–100", `{total}` the row count. */
  rangeOf: string
  /** The compact variant without rows: "Page 3 of 26". `{page}` is the bold current page, `{count}` the page count. */
  pageOf: string
}

export const paginationMessages: PaginationMessages = {
  label: 'Pagination',
  previous: 'Previous page',
  next: 'Next page',
  page: 'Page {page}',
  rangeOf: '{range} of {total}',
  pageOf: 'Page {page} of {count}',
}
