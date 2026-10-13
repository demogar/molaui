/** One row of a keyboard table: the keys, and what pressing them does. */
export interface KeyRow {
  /**
   * The keys, each a chord written with `+` between keys ("Shift+Tab",
   * "Control+Enter"). Several entries mean any of them works ("Enter",
   * "Space"). Key names as printed on a keyboard: Tab, Enter, Space, Escape,
   * ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, End, PageUp, PageDown,
   * Backspace, Delete, Shift, Control, Meta.
   */
  keys: string[]
  /** What happens, in one short sentence that starts with a verb. */
  action: string
}

/** The Accessibility section of a component's docs page. */
export interface Accessibility {
  /**
   * Required for a component that renders something a person focuses or
   * operates, and omitted for one that does not. `NON_INTERACTIVE` in
   * accessibility.ts says which, and usage.test.ts holds the data to it.
   */
  keyboard?: KeyRow[]
  /** What Mola does for you: roles, names, focus, announcements. From the source, not from hope. */
  handles: string[]
  /** What the component cannot do for you: the name, the label, the context only you know. */
  you: string[]
}
