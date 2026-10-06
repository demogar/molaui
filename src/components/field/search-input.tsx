'use client'

import { Search, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { Input, type InputProps } from './input'

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
  clearLabel = 'Clear search',
  value,
  defaultValue,
  onChange,
  className,
  placeholder = 'Search',
  ...props
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined
  const [inner, setInner] = React.useState(String(defaultValue ?? ''))
  const current = isControlled ? String(value ?? '') : inner

  function clear() {
    const input = inputRef.current
    if (!input) return
    if (!isControlled) setInner('')
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
      ref={inputRef}
      type="search"
      role="searchbox"
      placeholder={placeholder}
      value={isControlled ? value : inner}
      onChange={(event) => {
        if (!isControlled) setInner(event.target.value)
        onChange?.(event)
      }}
      className={cn('[&_input::-webkit-search-cancel-button]:appearance-none', className)}
      leading={<Search />}
      trailing={
        current ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={clear}
            className="-me-1 grid size-6 place-items-center text-ink-muted transition-colors duration-(--motion-cut) hover:bg-ink-soft hover:text-ink [&_svg]:size-3.5"
          >
            <X aria-hidden />
          </button>
        ) : shortcut ? (
          <kbd
            aria-hidden
            className="inline-flex h-5 min-w-5 items-center justify-center px-1.5 font-ui text-2xs font-semibold text-ink-2 bg-cloth-shade shadow-[0_0_0_1px_var(--keyline)] wdth-label"
          >
            {shortcut}
          </kbd>
        ) : null
      }
      {...props}
    />
  )
}
