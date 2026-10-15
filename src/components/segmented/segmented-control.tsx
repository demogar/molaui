'use client'

import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * One choice from a handful of views — Table | Board, Day | Week | Month,
 * Compact | Comfortable — where every option is visible at once and switching
 * is instant. More than five options, or options that need explaining, is a
 * select.
 *
 * The segments are cut from ONE piece: a single ink keyline runs round the
 * whole control, and the segments are divided by ink slits rather than each
 * carrying its own edge. Adjacent buttons with their own keylines would draw a
 * double line at every seam, and would read as a toolbar of separate actions
 * rather than one control with several positions.
 *
 * The chosen segment fills with ink — the same inversion as a checked
 * checkbox or chip, because it is the same idea.
 *
 * Built on Base UI's ToggleGroup, so it is a group of `aria-pressed` buttons
 * with roving focus on the arrow keys. A segment cannot be un-pressed by
 * pressing it again: a view switcher with no view selected is not a state the
 * screen behind it can render.
 */
export interface SegmentedOption<V extends string = string> {
  value: V
  label: React.ReactNode
  /** Optional leading icon. When `label` is visually hidden, it is still the accessible name. */
  icon?: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlBaseProps<V extends string = string>
  extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children' | 'aria-label' | 'aria-labelledby'> {
  /**
   * The segments, in order: a `value`, a `label` and optionally an icon or
   * `disabled`. Two to five short ones; past that, use a Select.
   */
  options: SegmentedOption<V>[]
  /** The pressed segment's `value`, controlled. Give one: a segmented control always has a choice made. */
  value?: V
  /** The segment pressed on first render, uncontrolled. */
  defaultValue?: V
  /**
   * Called with the newly pressed segment's `value`. Pressing the segment that is
   * already pressed does not call it, so the group never empties.
   */
  onValueChange?: (value: V) => void
  /** Height: `md` (the default) matches the other controls in a row; `sm` for a toolbar or a dense table header. */
  size?: 'sm' | 'md'
  /** Render icons only; labels become the accessible names. */
  iconOnly?: boolean
  /** Segments share the full width equally. */
  fill?: boolean
  /** Disables every segment. To disable one, set `disabled` on its option instead. */
  disabled?: boolean
}

/**
 * A name is required: three buttons reading "Table", "Board", "List" mean
 * nothing until a screen reader hears "View". It can be an `aria-label`, or
 * an `aria-labelledby` pointing at a visible heading; the second used to be
 * refused, which forced a duplicate, invisible name next to a visible one.
 */
export type SegmentedControlProps<V extends string = string> = SegmentedControlBaseProps<V> &
  ({ 'aria-label': string; 'aria-labelledby'?: string } | { 'aria-label'?: string; 'aria-labelledby': string })

/** `className`, `ref` and the rest of the DOM props go to the group. */
export function SegmentedControl<V extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  size = 'md',
  iconOnly = false,
  fill = false,
  disabled,
  className,
  ...props
}: SegmentedControlProps<V>) {
  return (
    <ToggleGroup
      {...props}
      data-slot="segmented-control"
      value={value === undefined ? undefined : [value]}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      disabled={disabled}
      className={cn(
        'inline-flex max-w-full items-stretch bg-cloth-pale shadow-cut',
        size === 'sm' ? 'h-(--control-h-sm)' : 'h-(--control-h)',
        fill && 'flex w-full',
        className,
      )}
      onValueChange={(next) => {
        // Pressing the active segment would empty the group; ignore it.
        const chosen = next[0] as V | undefined
        if (chosen !== undefined) onValueChange?.(chosen)
      }}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={iconOnly && typeof option.label === 'string' ? option.label : undefined}
          title={iconOnly && typeof option.label === 'string' ? option.label : undefined}
          className={cn(
            'relative inline-flex items-center justify-center gap-2 font-ui font-semibold uppercase leading-none tracking-label wdth-label text-ink-2',
            size === 'sm'
              ? 'px-[calc(var(--control-px)*0.75)] text-2xs'
              : 'px-(--control-px) text-xs',
            iconOnly && 'aspect-square px-0',
            // Segments give way before the page does: a long label truncates
            // rather than pushing the control past a phone's edge. Filled
            // segments also share the width; unfilled ones only shrink when
            // the control meets `max-w-full`, which three labelled segments
            // with icons did by 2px at 320.
            'min-w-0',
            fill && 'flex-1',
            // The slit between segments: an inset ink line on every segment
            // but the first, so the seams never double.
            'not-first:cut-s',
            'transition-[background-color,color]',
            'hover:bg-ink-soft hover:text-ink active:cut-press',
            'data-pressed:bg-ink data-pressed:text-on-ink data-pressed:hover:bg-ink data-pressed:hover:text-on-ink data-pressed:forced-selected',
            'focus-visible:z-(--z-lift) focus-visible:focus-ring',
            'data-disabled:cursor-not-allowed data-disabled:text-ink-muted data-disabled:hover:bg-transparent',
            // A disabled control keeps its pressed segment. Muted ink on that ink
            // fill is 2.99:1, and the hover reset above would strip the fill
            // under on-ink text, so the pressed segment names both.
            'data-disabled:data-pressed:text-on-ink-muted data-disabled:data-pressed:hover:bg-ink',
            '[&_svg]:size-(--icon) [&_svg]:shrink-0',
          )}
        >
          {option.icon ? <span aria-hidden className="contents">{option.icon}</span> : null}
          {iconOnly ? null : <span className="truncate">{option.label}</span>}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
