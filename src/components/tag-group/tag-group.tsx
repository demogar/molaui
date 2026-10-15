'use client'

import { useDirection } from '@base-ui/react/direction-provider'
import { Check, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useMergedRefs } from '../../lib/merge-props'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { type TagGroupMessages, tagGroupMessages } from './messages'

/**
 * A set of short values shown as tags: the labels on a Cayuco dataset, the
 * recipients of a report, the tools an agent may call. Tags can be removed,
 * and can be selected, one or several, when the set is also a choice.
 *
 * Chip is a filter (a real checkbox in a fieldset), and the chips inside a
 * multiple Combobox belong to its input. Neither is a set of values that
 * stands on its own and can be edited, which is what this is.
 *
 * ── one tab stop, a grid of rows ──
 * The obvious build, a list with a remove button in every tag, puts two tab
 * stops per tag in the page: forty for twenty labels before the next field.
 * So this follows the WAI-ARIA grid pattern, as the tag groups of the major
 * React libraries do: the group is a `grid`, each tag a focusable `row`, and
 * the arrows move between tags while Tab leaves the group. Delete or
 * Backspace removes the focused tag (`aria-keyshortcuts` says so), and focus
 * goes to the tag that took its place, so a run of deletions never drops
 * the keyboard on the page body. The × is still a real button, named
 * "Remove <label>", for a pointer and for a screen reader's browse mode; it
 * is left out of the tab order because the row already answers the key.
 *
 * Base UI has no tag group and no grid; its composite list is internal, and
 * importing internals would tie the library to a peer dependency's file
 * layout. The roving focus here is the APG's, written out and tested key by
 * key.
 *
 * A selected tag is a chosen value, so it takes the ink fill and a check,
 * like a checked chip; focus is the ring, so a focused tag can also be
 * seen to be selected or not.
 */
export interface TagGroupItem {
  value: string
  /** The tag's text, and the accessible name of its row. A string, so the remove button can be named after it. */
  label: string
  /** Shown and focusable, but neither removed nor selected. */
  disabled?: boolean
}

export interface TagGroupBaseProps
  extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children' | 'aria-label' | 'aria-labelledby'> {
  /** The tags, in order. The group shows them; your state owns them. */
  items: TagGroupItem[]
  /**
   * Makes the tags removable: an × on each, and Delete or Backspace on the
   * focused one. The group does not own the list; remove the item in your
   * state and focus moves to its neighbour.
   */
  onRemove?: (value: string) => void
  /** Accessible name of each remove button. */
  removeLabel?: (label: string) => string
  /** `none` (the default) for a set you only read or edit, `single` or `multiple` for a choice. */
  selectionMode?: 'none' | 'single' | 'multiple'
  /** The selected tags. With `single`, at most one. */
  value?: string[]
  /** The tags selected at first, when the group keeps its own selection. */
  defaultValue?: string[]
  /** Called with every selected tag, in the order of `items`, when the selection changes. */
  onValueChange?: (value: string[]) => void
  /** What the group says when it has no tags. Kept as text, so an empty group is never a blank gap. */
  empty?: React.ReactNode
  /** No tag can be removed or selected; they stay readable. */
  disabled?: boolean
  /** Words for translation: the remove buttons' default name and the empty text. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<TagGroupMessages>
}

/**
 * A name is required: "Billing, Retention" are tags of something, and a
 * screen reader hears that something before the first tag.
 */
export type TagGroupProps = TagGroupBaseProps &
  ({ 'aria-label': string; 'aria-labelledby'?: string } | { 'aria-label'?: string; 'aria-labelledby': string })

const tagClasses = [
  'group/tag relative inline-flex h-(--control-h-sm) max-w-full min-w-0 items-center gap-1.5 ps-[calc(var(--control-px)*0.85)] pe-[calc(var(--control-px)*0.85)]',
  'bg-cloth-pale font-ui text-sm leading-none text-ink-2 shadow-cut outline-none select-none',
  'transition-[background-color,color]',
  'focus-visible:focus-ring',
  'aria-selected:bg-ink aria-selected:text-on-ink aria-selected:forced-selected',
  'aria-disabled:bg-disabled aria-disabled:text-ink-muted',
  'aria-disabled:aria-selected:bg-ink aria-disabled:aria-selected:text-on-ink-muted',
  '[&_svg]:size-(--icon-sm) [&_svg]:shrink-0',
]

/** `className`, `ref` and the rest of the DOM props go to the grid. */
export function TagGroup({
  items,
  onRemove,
  removeLabel: removeLabelProp,
  selectionMode = 'none',
  value,
  defaultValue,
  onValueChange,
  empty: emptyProp,
  disabled = false,
  messages,
  className,
  ref,
  onKeyDown: onKeyDownProp,
  ...props
}: TagGroupProps) {
  const [t, f] = useMessages('tagGroup', tagGroupMessages, messages)
  const removeLabel = removeLabelProp ?? ((name: string) => f.format(t.remove, { name }))
  const empty = emptyProp ?? t.empty
  const direction = useDirection()
  const [selected, setSelected] = useControllable<string[]>({
    value,
    defaultValue: () => defaultValue ?? [],
    onChange: onValueChange,
  })
  const selectable = selectionMode !== 'none'
  const removable = onRemove !== undefined && !disabled

  const rows = React.useRef<(HTMLDivElement | null)[]>([])
  const grid = React.useRef<HTMLDivElement | null>(null)
  const setGridRef = useMergedRefs(grid, ref)
  const [active, setActive] = React.useState(0)
  const tabStop = Math.min(active, Math.max(items.length - 1, 0))
  // After a removal the list changes in the parent's next render. Which
  // index should hold focus then is kept here and applied once it lands.
  const refocus = React.useRef<number | null>(null)

  React.useLayoutEffect(() => {
    const index = refocus.current
    if (index === null) return
    refocus.current = null
    if (items.length === 0) grid.current?.focus()
    else rows.current[Math.min(index, items.length - 1)]?.focus()
  }, [items])

  const usable = (i: number) => !disabled && items[i] !== undefined && !items[i].disabled

  function focus(i: number) {
    setActive(i)
    rows.current[i]?.focus()
  }

  function remove(i: number) {
    const item = items[i]
    if (!item || !removable || !usable(i)) return
    refocus.current = i
    setActive(Math.max(0, Math.min(i, items.length - 2)))
    onRemove?.(item.value)
  }

  function toggle(i: number) {
    const item = items[i]
    if (!item || !selectable || !usable(i)) return
    if (selected.includes(item.value)) setSelected(selected.filter((v) => v !== item.value))
    else if (selectionMode === 'single') setSelected([item.value])
    else setSelected(items.filter((t) => t.value === item.value || selected.includes(t.value)).map((t) => t.value))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0 || event.target === grid.current) return
    const last = items.length - 1
    // Left and right follow the reading direction; the tags wrap like
    // words, so up and down mean previous and next as well.
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    switch (event.key) {
      case forward:
      case 'ArrowDown':
        event.preventDefault()
        focus(Math.min(tabStop + 1, last))
        return
      case back:
      case 'ArrowUp':
        event.preventDefault()
        focus(Math.max(tabStop - 1, 0))
        return
      case 'Home':
        event.preventDefault()
        focus(0)
        return
      case 'End':
        event.preventDefault()
        focus(last)
        return
      case 'Delete':
      case 'Backspace':
        if (!removable) return
        event.preventDefault()
        remove(tabStop)
        return
      case ' ':
      case 'Enter':
        if (!selectable) return
        event.preventDefault()
        toggle(tabStop)
        return
    }
  }


  // The consumer's handler runs first, and `preventDefault()` in it keeps
  // this one from running: the order and the escape hatch `mergeProps`
  // gives, written out because the React compiler's ref rule refuses to let
  // a handler that reads refs be passed through a function during render.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDownProp?.(event)
    if (!event.defaultPrevented) onKeyDown(event)
  }
  return (
    <div
      role="grid"
      data-slot="tag-group"
      aria-multiselectable={selectionMode === 'multiple' || undefined}
      aria-disabled={disabled || undefined}
      // Focusable only when empty, and only by script: the last removal moves
      // focus here rather than letting it fall to the page body.
      tabIndex={items.length === 0 ? -1 : undefined}
      className={cn('flex min-w-0 flex-wrap gap-2 outline-none', className)}
      {...props}
      onKeyDown={handleKeyDown}
      ref={setGridRef}
    >
      {items.length === 0 ? (
        <div role="row">
          <div role="gridcell" data-part="empty" className="text-sm text-ink-muted">
            {empty}
          </div>
        </div>
      ) : (
        items.map((item, i) => {
          const isSelected = selected.includes(item.value)
          const isDisabled = disabled || item.disabled === true
          return (
            <div
              key={item.value}
              ref={(el) => {
                rows.current[i] = el
              }}
              role="row"
              data-part="tag"
              aria-label={item.label}
              aria-selected={selectable ? isSelected : undefined}
              aria-disabled={isDisabled || undefined}
              aria-keyshortcuts={removable && !isDisabled ? 'Delete Backspace' : undefined}
              tabIndex={i === tabStop ? 0 : -1}
              className={cn(tagClasses, selectable && !isDisabled && 'cursor-pointer', removable && !isDisabled && 'pe-0.5')}
              onFocus={() => setActive(i)}
              onClick={() => {
                setActive(i)
                toggle(i)
              }}
            >
              {/* Two cells, the label and the ×, so a screen reader moving by
                  cell hears "Billing", then "Remove Billing", rather than one
                  cell named with both. */}
              <span role="gridcell" className="flex min-w-0 items-center gap-1.5">
                {selectable && isSelected ? <Check aria-hidden strokeWidth={2.5} data-part="check" /> : null}
                <span data-part="label" className="truncate">
                  {item.label}
                </span>
              </span>
              {/* A locked tag keeps its text but loses its ×: a remove
                  button that does nothing is a broken promise. */}
              {removable && !isDisabled ? (
                <span role="gridcell" className="flex">
                  <button
                    type="button"
                    tabIndex={-1}
                    data-part="remove"
                    aria-label={removeLabel(item.label)}
                    className="grid size-5 cursor-pointer place-items-center text-current transition-colors hover:bg-ink-soft group-aria-selected/tag:hover:bg-on-ink group-aria-selected/tag:hover:text-ink"
                    onClick={(event) => {
                      // Not a selection: the row's click would toggle it.
                      event.stopPropagation()
                      remove(i)
                    }}
                  >
                    <X aria-hidden />
                  </button>
                </span>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}
