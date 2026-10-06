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

export interface SegmentedControlProps<V extends string = string> {
  options: SegmentedOption<V>[]
  value?: V
  defaultValue?: V
  onValueChange?: (value: V) => void
  /** Names the group. Required: three buttons reading "Table", "Board", "List" mean nothing until a screen reader hears "View". */
  'aria-label': string
  size?: 'sm' | 'md'
  /** Render icons only; labels become the accessible names. */
  iconOnly?: boolean
  /** Segments share the full width equally. */
  fill?: boolean
  disabled?: boolean
  className?: string
}

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
  ...aria
}: SegmentedControlProps<V>) {
  return (
    <ToggleGroup
      data-slot="segmented-control"
      value={value === undefined ? undefined : [value]}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      onValueChange={(next) => {
        // Pressing the active segment would empty the group; ignore it.
        const chosen = next[0] as V | undefined
        if (chosen !== undefined) onValueChange?.(chosen)
      }}
      disabled={disabled}
      className={cn(
        'inline-flex items-stretch bg-cloth-pale shadow-cut',
        size === 'sm' ? 'h-(--control-h-sm)' : 'h-(--control-h)',
        fill && 'flex w-full',
        className,
      )}
      {...aria}
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
            // Filled segments share the width and give way before the page
            // does: a long label truncates rather than pushing the control
            // past a phone's edge.
            fill && 'min-w-0 flex-1',
            // The slit between segments: an inset ink line on every segment
            // but the first, so the seams never double.
            'not-first:shadow-[inset_1.5px_0_0_var(--ink)]',
            'transition-[background-color,color] duration-(--motion-cut) ease-cut',
            'hover:bg-ink-soft hover:text-ink',
            'data-pressed:bg-ink data-pressed:text-on-ink data-pressed:hover:bg-ink',
            'focus-visible:z-10 focus-visible:shadow-[var(--focus-ring)]',
            'data-disabled:cursor-not-allowed data-disabled:text-ink-muted data-disabled:hover:bg-transparent',
            '[&_svg]:size-4 [&_svg]:shrink-0',
          )}
        >
          {option.icon ? <span aria-hidden className="contents">{option.icon}</span> : null}
          {iconOnly ? null : fill ? <span className="truncate">{option.label}</span> : option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
