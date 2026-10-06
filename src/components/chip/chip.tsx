import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A filter you can see the state of. A real `<input type="checkbox|radio">`
 * sits inside the styled `<label>`, hidden with the clip pattern (`sr-only`)
 * rather than `display:none`, so it stays focusable and in the accessibility
 * tree. Keyboard handling, radio-group arrow keys, the checked state and form
 * submission all come from the platform — there is no ARIA widget to keep in
 * sync and nothing to re-implement.
 *
 * State hangs off `:has()` on the label, so the label is the single styled
 * element: no wrapper, no `peer` class a caller could drop by accident.
 *
 * Choosing a filter is the closest thing an interface has to cutting a layer,
 * so a checked chip does what a cut does — it fills with ink and the label
 * reads in cloth. Hovering an unchecked one reveals the band beneath it,
 * which is the same gesture stopped halfway.
 *
 * Heights come from the density tokens, so a row of filters above a compact
 * table is as tight as the table.
 */
export const chipVariants = cva(
  [
    'relative inline-flex items-center gap-1.5 cursor-pointer select-none',
    'rounded-none shadow-cut band-oro [--cut-reveal:3px]',
    'font-ui text-sm text-ink-2 bg-cloth-pale',
    'transition-[background-color,box-shadow,color] duration-(--motion-cut) ease-cut',
    // Hover is scoped to the unchecked state: a checked chip is cloth on ink,
    // and revealing a band around it would fight the fill it just took.
    'hover:not-has-checked:cut-band hover:not-has-checked:text-ink',
    'has-checked:bg-ink has-checked:text-on-ink',
    // The focus ring is itself a two-tone band, so it stands in for the keyline.
    'has-focus-visible:shadow-[var(--focus-ring)]',
    'has-disabled:pointer-events-none has-disabled:bg-cloth-shade has-disabled:text-ink-muted',
    '[&_svg]:size-3.5 [&_svg]:shrink-0',
  ],
  {
    variants: {
      size: {
        /** Filter chips: one line, never wraps. */
        default: 'h-(--control-h-sm) px-[calc(var(--control-px)*0.85)] leading-none whitespace-nowrap',
        /** Longer labels, which do wrap. */
        comfortable: 'min-h-(--control-h) px-(--control-px) py-2 leading-[1.2]',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

export interface ChipProps
  extends Omit<React.ComponentProps<'input'>, 'size' | 'type' | 'children'>,
    VariantProps<typeof chipVariants> {
  /** `radio` for one-of-N within a `name` group, `checkbox` for multi-select. */
  type?: 'checkbox' | 'radio'
  /** The visible label. Also the control's accessible name, via the wrapping `<label>`. */
  children: React.ReactNode
  /** A count after the label: how many rows this filter would leave. Tabular, so a row of chips does not jitter as counts change. */
  count?: number
}

export function Chip({ className, size, type = 'checkbox', count, children, ...props }: ChipProps) {
  return (
    <label data-slot="chip" className={cn(chipVariants({ size }), className)}>
      <input type={type} className="sr-only" {...props} />
      {children}
      {count !== undefined ? (
        // A real space before the count, as a text node: the gap drawn is a
        // margin, and margins are invisible to name computation — without it
        // the chip is announced as "Failed12".
        <>
          {' '}
          <span className="ml-0.5 text-xs tabular opacity-75">{count.toLocaleString('en-US')}</span>
        </>
      ) : null}
    </label>
  )
}

export interface ChipGroupProps extends React.ComponentProps<'fieldset'> {
  /** What the chips filter. Rendered as the legend, so each chip is announced in its context. */
  legend: React.ReactNode
  /** Hide the legend visually while keeping it for assistive technology — for a toolbar row whose meaning is obvious from position. */
  hideLegend?: boolean
}

/**
 * A row of chips inside a real fieldset. The legend is what a screen reader
 * says before the first chip — "Status, group" — so "Failed" is heard as a
 * status filter rather than as an alarming word on its own.
 */
export function ChipGroup({ legend, hideLegend = false, className, children, ...props }: ChipGroupProps) {
  return (
    <fieldset data-slot="chip-group" className={cn('m-0 min-w-0 border-0 p-0', className)} {...props}>
      <legend className={cn('mb-3 p-0 rotulo text-ink-2', hideLegend && 'sr-only')}>{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
