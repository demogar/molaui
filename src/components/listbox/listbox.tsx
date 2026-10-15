'use client'

import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { useTypeahead } from '../../lib/typeahead'
import { useControllable } from '../../lib/use-controllable'

/**
 * A list of options that stays on the page: choose one, or several, without
 * opening anything. Combobox `multiple` was the only multi-select, and it
 * hides the options until you type; when the set is short and the choices
 * are the content (the regions a Cayuco workspace stores data in, the
 * models an evaluation compares), the options belong in view.
 *
 * Base UI has no standalone listbox (its list lives inside Select and
 * Combobox popups, and its composite list is internal), so this is the
 * WAI-ARIA APG listbox pattern written out:
 *
 * - **Roving focus.** The options are focused, not the list, with one tab
 *   stop at the selected (or last focused) option. `aria-activedescendant`
 *   was the other way; with real focus the page's own focus ring and
 *   `scrollIntoView` work without a second highlight to keep in sync.
 * - **Single: selection follows focus**, as it does in a radio group and a
 *   native `<select size>`. Moving is choosing; there is no second key to
 *   learn.
 * - **Multiple: the APG's recommended model**, where arrows only move and
 *   Space toggles, so nothing is lost by moving. Shift with an arrow extends,
 *   Shift+Space selects the run from the last chosen option, Control+Shift+
 *   Home/End select to either end, and Control+A (Meta+A on a Mac) selects
 *   every option or clears them all.
 * - **Disabled options stay focusable**, so a keyboard user learns they
 *   exist and why they cannot be chosen, the way a pointer user sees them.
 *   They are never selected, by any key.
 *
 * A chosen option is a value, and a value in this system is an ink fill
 * (Foundations/Layers): the same inversion as a checked chip or a pressed
 * segment. It also carries a mark — a check for one, a filled square for
 * several — so the state is never the colour alone, and a multiple list
 * shows its empty squares before anything is chosen, which says "you may
 * choose more than one" before anyone tries.
 */
export interface ListboxOption<V extends string = string> {
  value: V
  /** The option's name. Its text is what type-ahead matches. */
  label: React.ReactNode
  /** A second line: a region's city, a model's context window. Read as the option's description. */
  description?: React.ReactNode
  /** Shown and focusable, never selected. */
  disabled?: boolean
}

export interface ListboxCommonProps<V extends string = string>
  extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children' | 'aria-label' | 'aria-labelledby'> {
  /** The options, in the order they are shown and reported. */
  options: ListboxOption<V>[]
  /** Every option is shown and none can be chosen or focused, as a disabled native list. */
  disabled?: boolean
}

export interface ListboxSingleProps<V extends string = string> extends ListboxCommonProps<V> {
  /** Leave unset (or `false`) for one choice, where moving with the arrows chooses. */
  multiple?: false
  /** The chosen option, when you control it; `null` is "nothing chosen yet". */
  value?: V | null
  /** The option chosen at first, when the list keeps its own value. */
  defaultValue?: V | null
  /** Called with the newly chosen option, only when it changes. */
  onValueChange?: (value: V | null) => void
}

export interface ListboxMultipleProps<V extends string = string> extends ListboxCommonProps<V> {
  /** Several choices: the arrows only move, and Space toggles the focused option. */
  multiple: true
  /** The chosen options, in the order of `options`, when you control them. */
  value?: V[]
  /** The options chosen at first, when the list keeps its own value. */
  defaultValue?: V[]
  /** Called with every chosen option, in the order of `options`, when the set changes. */
  onValueChange?: (value: V[]) => void
}

/**
 * A name is required: a list of regions is only "Data regions" once
 * something says so. An `aria-labelledby` pointing at a visible heading or
 * label is better than a second, invisible name.
 */
export type ListboxProps<V extends string = string> = (ListboxSingleProps<V> | ListboxMultipleProps<V>) &
  ({ 'aria-label': string; 'aria-labelledby'?: string } | { 'aria-label'?: string; 'aria-labelledby': string })

const optionClasses = [
  'group/option relative grid min-h-(--control-h) cursor-default grid-cols-[1rem_1fr] items-center gap-x-2.5 py-1.5 pe-3 ps-2 text-base outline-none select-none',
  'hover:bg-ink-soft',
  'aria-selected:bg-ink aria-selected:font-semibold aria-selected:text-on-ink aria-selected:hover:bg-ink aria-selected:forced-selected',
  // Drawn inside: the list scrolls, and its overflow would shave an outer
  // ring to one edge. The inset ring's cloth line reads on the ink fill too.
  'focus-visible:focus-ring-inset',
  'aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-disabled:hover:bg-transparent',
  // Chosen and disabled at once (a value set before the option was locked,
  // or a disabled list): muted ink on the ink fill is 2.99:1, so the pair is
  // named rather than left to variant order, and hover keeps the fill.
  'aria-disabled:aria-selected:text-on-ink-muted aria-disabled:aria-selected:hover:bg-ink',
]

/** The mark in the first column: a check for one, a square for several. */
function Mark({ multiple, selected }: { multiple: boolean; selected: boolean }) {
  if (!multiple) {
    return (
      <span aria-hidden className="col-start-1 hidden group-aria-selected/option:flex [&_svg]:size-(--icon-sm)">
        <Check strokeWidth={2.5} />
      </span>
    )
  }
  // The square is the text's colour, so it is ink on cloth and cloth on the
  // ink fill. A chosen square is filled and checked in the row's ground.
  return (
    <span
      aria-hidden
      data-part="mark"
      className={cn(
        'col-start-1 grid size-3.5 place-items-center cut-current',
        'group-aria-selected/option:bg-on-ink group-aria-selected/option:text-ink group-aria-selected/option:forced-on-selected',
        '[&_svg]:size-[85%]',
      )}
    >
      {selected ? <Check strokeWidth={3} /> : null}
    </span>
  )
}

/** `className`, `ref` and the rest of the DOM props go to the list, which wears the cut. */
export function Listbox<V extends string = string>(props: ListboxProps<V>) {
  const {
    options,
    disabled = false,
    multiple: _multiple,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    className,
    onKeyDown: onKeyDownProp,
    ...rest
  } = props
  const multiple = props.multiple === true

  // One controllable list underneath both modes, so the keyboard code below
  // reads one shape. A single value is a list of at most one.
  const [selected, setSelected] = useControllable<V[]>({
    value: props.value === undefined ? undefined : props.value === null ? [] : Array.isArray(props.value) ? props.value : [props.value],
    defaultValue: () =>
      props.defaultValue == null ? [] : Array.isArray(props.defaultValue) ? props.defaultValue : [props.defaultValue],
    onChange: (next) => {
      if (props.multiple) props.onValueChange?.(next)
      else props.onValueChange?.(next[0] ?? null)
    },
  })

  const uid = React.useId()
  const items = React.useRef<(HTMLDivElement | null)[]>([])
  const typeahead = useTypeahead()
  // The option holding the tab stop. Until the list is used, the first
  // chosen option, else the first: Tab lands where the value is.
  const [active, setActive] = React.useState<number | null>(null)
  const firstSelected = options.findIndex((o) => selected.includes(o.value))
  const tabStop = Math.min(active ?? (firstSelected >= 0 ? firstSelected : 0), Math.max(options.length - 1, 0))
  // The option Shift+Space and Shift+click extend from: the last one chosen.
  const anchor = React.useRef<number | null>(null)

  const inOrder = (values: Set<V>) => options.filter((o) => values.has(o.value)).map((o) => o.value)
  const selectable = (i: number) => !disabled && options[i] !== undefined && !options[i].disabled

  function focus(i: number) {
    setActive(i)
    items.current[i]?.focus()
  }

  function choose(i: number) {
    const option = options[i]
    if (!option || !selectable(i)) return
    anchor.current = i
    setSelected([option.value])
  }

  function toggle(i: number) {
    const option = options[i]
    if (!option || !selectable(i)) return
    anchor.current = i
    const next = new Set(selected)
    if (next.has(option.value)) next.delete(option.value)
    else next.add(option.value)
    setSelected(inOrder(next))
  }

  /** Adds every selectable option from `from` to `to` to the selection. */
  function selectRange(from: number, to: number) {
    const next = new Set(selected)
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
      const option = options[i]
      if (option && selectable(i)) next.add(option.value)
    }
    anchor.current = to
    setSelected(inOrder(next))
  }

  /** Focus `i`, and in a single list choose it: selection follows focus. */
  function move(i: number) {
    focus(i)
    if (!multiple) choose(i)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled || options.length === 0) return
    const last = options.length - 1
    const current = tabStop
    const mod = event.ctrlKey || event.metaKey
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const next = event.key === 'ArrowDown' ? Math.min(current + 1, last) : Math.max(current - 1, 0)
        event.preventDefault()
        if (multiple && event.shiftKey) {
          focus(next)
          if (next !== current) toggle(next)
        } else move(next)
        return
      }
      case 'Home':
      case 'End': {
        const next = event.key === 'Home' ? 0 : last
        event.preventDefault()
        if (multiple && mod && event.shiftKey) {
          selectRange(current, next)
          focus(next)
        } else move(next)
        return
      }
      case ' ': {
        event.preventDefault()
        if (multiple && event.shiftKey) selectRange(anchor.current ?? current, current)
        else if (multiple) toggle(current)
        else choose(current)
        return
      }
      case 'a':
      case 'A': {
        if (!multiple || !mod) break
        event.preventDefault()
        const all = options.filter((_, i) => selectable(i)).map((o) => o.value)
        setSelected(all.every((v) => selected.includes(v)) ? [] : all)
        return
      }
    }
    const match = typeahead(
      event,
      items.current.slice(0, options.length).map((el) => el?.querySelector('[data-part="label"]')?.textContent ?? ''),
      current,
    )
    if (match >= 0) {
      event.preventDefault()
      move(match)
    }
  }

  function onOptionClick(event: React.MouseEvent, i: number) {
    if (disabled) return
    focus(i)
    if (!multiple) choose(i)
    else if (event.shiftKey && anchor.current !== null) selectRange(anchor.current, i)
    else toggle(i)
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
      role="listbox"
      data-slot="listbox"
      aria-multiselectable={multiple || undefined}
      aria-disabled={disabled || undefined}
      aria-orientation="vertical"
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'flex min-w-0 flex-col overflow-y-auto scroll-cloth bg-cloth-pale p-1 text-ink shadow-cut',
        disabled && 'bg-disabled',
        className,
      )}
      {...rest}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, i) => {
        const isSelected = selected.includes(option.value)
        const isDisabled = disabled || option.disabled === true
        const descriptionId = `${uid}-${i}-description`
        return (
          <div
            key={option.value}
            ref={(el) => {
              items.current[i] = el
            }}
            role="option"
            data-part="option"
            aria-selected={isSelected}
            aria-disabled={isDisabled || undefined}
            aria-describedby={option.description ? descriptionId : undefined}
            tabIndex={disabled ? undefined : i === tabStop ? 0 : -1}
            className={cn(optionClasses)}
            onClick={(event) => onOptionClick(event, i)}
            onFocus={() => setActive(i)}
          >
            <Mark multiple={multiple} selected={isSelected} />
            <span className="col-start-2 min-w-0">
              <span data-part="label" className="block truncate">
                {option.label}
              </span>
              {option.description ? (
                // Hidden from the name, read as the description: the option is
                // "Cayuco Swift", not "Cayuco Swift 32k context fastest", and
                // the second line still reaches a screen reader after it.
                <span
                  id={descriptionId}
                  aria-hidden
                  data-part="description"
                  className="block truncate text-xs font-normal text-ink-2 group-aria-selected/option:text-on-ink-muted group-aria-disabled/option:text-ink-muted"
                >
                  {option.description}
                </span>
              ) : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}
