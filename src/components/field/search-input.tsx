'use client'

import { Search, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useMergedRefs } from '../../lib/merge-props'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { Input, type InputProps } from './input'
import { type SearchInputMessages, searchInputMessages } from './messages'

export interface SearchInputProps extends Omit<InputProps, 'leading' | 'trailing' | 'type'> {
  /**
   * The keyboard shortcut that focuses this field, shown as a key cap while
   * the field is empty — e.g. `⌘K` or `/`. Display only: binding the key is
   * the page's job, because only the page knows what else is listening.
   */
  shortcut?: string
  /** Called after the clear button empties the field. */
  onClear?: () => void
  /** Accessible name for the clear button. */
  clearLabel?: string
  /** Words for translation: the clear button's default name and the default placeholder. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<SearchInputMessages>
}

/**
 * The filter box that heads every list in an internal tool.
 *
 * `type="search"` for the semantics (a `searchbox` role, Escape-to-clear on
 * most platforms) with the browser's own cancel glyph removed, because it is
 * a rounded grey circle from no design system at all — the clear button here
 * is a real button with a name, and it returns focus to the field so clearing
 * a query never strands a keyboard user on a control that just disappeared.
 *
 * The shortcut cap and the clear button occupy the same slot and never show
 * together: the cap is advice for an empty field, the button an action on a
 * full one.
 */
export function SearchInput({
  shortcut,
  onClear,
  clearLabel,
  value,
  defaultValue,
  onChange,
  className,
  placeholder,
  messages,
  ref: refProp,
  ...props
}: SearchInputProps) {
  const [t] = useMessages('searchInput', searchInputMessages, messages)
  // The clear button needs the input, and so may the consumer (to focus it
  // from a shortcut). Both refs are attached; one replacing the other is how
  // the clear button used to stop working when a ref was passed.
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ref = useMergedRefs(inputRef, refProp)
  // The text is tracked even when uncontrolled, because the clear button
  // and the shortcut cap swap on whether there is any. The change itself is
  // reported through the input's own `onChange`, so no value callback here.
  const [current, setCurrent] = useControllable({
    value: value === undefined ? undefined : String(value ?? ''),
    defaultValue: String(defaultValue ?? ''),
  })

  function clear() {
    const input = inputRef.current
    if (!input) return
    setCurrent('')
    // Route the clear through a real input event so a controlled parent's
    // onChange sees it exactly as it would see the user deleting the text.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
    onClear?.()
  }

  return (
    <Input
      type="search"
      role="searchbox"
      placeholder={placeholder ?? t.placeholder}
      value={value ?? current}
      className={cn('[&_input::-webkit-search-cancel-button]:appearance-none', className)}
      leading={<Search />}
      trailing={
        current ? (
          <button
            type="button"
            aria-label={clearLabel ?? t.clear}
            onClick={clear}
            className="-me-1 grid size-6 place-items-center text-ink-muted transition-colors hover:bg-ink-soft hover:text-ink [&_svg]:size-(--icon-sm)"
          >
            <X aria-hidden />
          </button>
        ) : shortcut ? (
          <kbd
            aria-hidden
            className="inline-flex h-5 min-w-5 items-center justify-center px-1.5 font-ui text-2xs font-semibold text-ink-2 bg-cloth-shade rule-ring wdth-label"
          >
            {shortcut}
          </kbd>
        ) : null
      }
      {...props}
      ref={ref}
      onChange={(event) => {
        setCurrent(event.target.value)
        onChange?.(event)
      }}
    />
  )
}
