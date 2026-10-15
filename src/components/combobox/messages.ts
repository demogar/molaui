import type { PluralMessage } from '../../lib/messages'

/** The words Combobox says on its own. */
export interface ComboboxMessages {
  /** The status line while `loading`. */
  searching: string
  /** What the popup says when nothing matches, when `emptyMessage` is not set. */
  noMatches: string
  /** The clear button's accessible name, when `clearLabel` is not set. */
  clear: string
  /** The open button's accessible name, when `triggerLabel` is not set. */
  showOptions: string
  /** Each chip's remove button, when `removeLabel` is not set. `{name}` is the option's label. */
  remove: string
  /** The accessible name of the chip list with `multiple`. */
  selected: string
  /**
   * The hint read from the input when chips are selected. `{count}` is how
   * many, `{key}` is `keyLeft` or `keyRight`: the arrow that points back, which
   * flips in right-to-left.
   */
  chipsHint: PluralMessage
  /** The left arrow key's name, in `chipsHint`. */
  keyLeft: string
  /** The right arrow key's name, in `chipsHint`. */
  keyRight: string
}

export const comboboxMessages: ComboboxMessages = {
  searching: 'Searching…',
  noMatches: 'No matches',
  clear: 'Clear selection',
  showOptions: 'Show options',
  remove: 'Remove {name}',
  selected: 'Selected',
  chipsHint: {
    one: '{count} selected. Press {key} Arrow from the start of the field to reach them.',
    other: '{count} selected. Press {key} Arrow from the start of the field to reach them.',
  },
  keyLeft: 'Left',
  keyRight: 'Right',
}

/** The words Autocomplete says on its own. */
export interface AutocompleteMessages {
  /** The status line while `loading`. */
  searching: string
}

export const autocompleteMessages: AutocompleteMessages = {
  searching: 'Searching…',
}
