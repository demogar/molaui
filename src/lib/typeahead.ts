'use client'

import * as React from 'react'

/** How long a pause ends a typed word, in ms. The WAI-ARIA examples use 500. */
const RESET_MS = 500

/**
 * Type-ahead for the composite widgets Mola builds itself (Listbox, Tree):
 * typing moves focus to the next item whose text starts with what was typed.
 *
 * Base UI does this inside Select, Menu and Combobox, but exports no hook for
 * it, and its internal composite list is not public API: importing
 * `@base-ui/react/internals/*` would tie the library to a file layout a
 * consumer's Base UI (a peer dependency, `^1.9.0`) is free to change in a
 * patch. So the two widgets share this instead of writing it twice.
 *
 * The behaviour is the APG's: letters typed within half a second build one
 * word ("re" reaches "Retention" past "Refunds" only if "Ret" is typed);
 * the same letter pressed again cycles through the items that start with it;
 * the search starts after the focused item and wraps. Space is part of a word
 * once one has started, and otherwise left to the widget, which uses it to
 * select.
 *
 * Returns a function: give it the key event, each item's text, and the
 * focused index; it returns the index to move to, or -1 when the key is not
 * type-ahead or nothing matches.
 */
export function useTypeahead(): (event: React.KeyboardEvent, texts: readonly string[], from: number) => number {
  const word = React.useRef({ query: '', at: 0 })
  return React.useCallback((event, texts, from) => {
    const { key } = event
    if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return -1
    const now = Date.now()
    if (now - word.current.at > RESET_MS) word.current.query = ''
    if (key === ' ' && word.current.query === '') return -1
    word.current = { query: word.current.query + key.toLocaleLowerCase(), at: now }
    const { query } = word.current
    const repeated = [...query].every((ch) => ch === query[0])
    // One letter, or the same letter again, looks past the focused item; a
    // longer word may still match the item it is on.
    const needle = repeated ? (query[0] as string) : query
    const start = repeated ? from + 1 : from
    const n = texts.length
    for (let i = 0; i < n; i++) {
      const index = (((start + i) % n) + n) % n
      if ((texts[index] ?? '').trim().toLocaleLowerCase().startsWith(needle)) return index
    }
    return -1
  }, [])
}
