/** The words Label says on its own. */
export interface LabelMessages {
  /** The tag `optional` adds after the label. */
  optional: string
}

export const labelMessages: LabelMessages = {
  optional: 'Optional',
}

/** The words SearchInput says on its own. */
export interface SearchInputMessages {
  /** The clear button's accessible name, when `clearLabel` is not set. */
  clear: string
  /** The placeholder, when `placeholder` is not set. */
  placeholder: string
}

export const searchInputMessages: SearchInputMessages = {
  clear: 'Clear search',
  placeholder: 'Search',
}
