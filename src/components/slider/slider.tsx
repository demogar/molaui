'use client'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A continuous value — temperature, a sampling rate, a rollout percentage —
 * where the range matters as much as the number.
 *
 * The track is a cut groove: a shaded channel inside an ink keyline, with the
 * chosen span filled in ink. The thumb is a square of raised cloth that
 * reveals the gold band when it is grabbed, the same gesture as every other
 * control here.
 *
 * The value is always printed, in tabular figures, at the right of the label.
 * A slider whose number can only be learned by dragging it is a control for
 * guessing; and tabular figures stop the label from jittering sideways as
 * "0.7" becomes "0.75".
 *
 * Base UI renders a real `<input type="range">` inside each thumb, so the
 * keyboard (arrows, Page Up/Down for `largeStep`, Home/End) and the screen
 * reader value come from the platform.
 */
export interface SliderProps
  extends Omit<SliderPrimitive.Root.Props<number | readonly number[]>, 'className' | 'children'> {
  /** Visible label. Names the thumb(s). */
  label?: React.ReactNode
  /** Print the current value beside the label. */
  showValue?: boolean
  /** Format the printed value. Defaults to Base UI's locale formatting via `format`. */
  formatValue?: (formatted: string, value: number) => React.ReactNode
  /** Labels under the two ends of the track: "Precise" / "Creative". */
  minLabel?: React.ReactNode
  maxLabel?: React.ReactNode
  className?: string
}

export function Slider({
  label,
  showValue = true,
  formatValue,
  minLabel,
  maxLabel,
  className,
  ...props
}: SliderProps) {
  // One thumb per value: a range slider is the same component with two.
  const initial = props.value ?? props.defaultValue
  const thumbCount = Array.isArray(initial) ? initial.length : 1
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn('flex w-full flex-col gap-2.5', className)} {...props}>
      {label || showValue ? (
        <div className="flex items-baseline justify-between gap-4">
          {label ? <SliderPrimitive.Label className="rotulo text-ink-2">{label}</SliderPrimitive.Label> : <span />}
          {showValue ? (
            <SliderPrimitive.Value className="font-ui text-sm font-semibold text-ink tabular">
              {(formatted, values) =>
                formatted
                  .map((text, i) => (formatValue ? formatValue(text, values[i]!) : text))
                  .reduce<React.ReactNode[]>(
                    (out, part, i) => (i === 0 ? [part] : [...out, ' – ', part]),
                    [],
                  )
              }
            </SliderPrimitive.Value>
          ) : null}
        </div>
      ) : null}
      <SliderPrimitive.Control className="flex h-5 w-full touch-none items-center select-none data-disabled:cursor-not-allowed">
        <SliderPrimitive.Track className="relative h-1.5 w-full bg-cloth-shade shadow-cut">
          <SliderPrimitive.Indicator className="bg-ink forced-ink data-disabled:bg-ink-muted" />
          {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            index={index}
            className={cn(
              'size-4 rounded-none bg-cloth-pale shadow-cut band-oro [--cut-reveal:3px]',
              'transition-[box-shadow] duration-(--motion-cut) ease-cut',
              'hover:cut-band data-dragging:cut-band',
              'has-focus-visible:shadow-[var(--focus-ring)] has-focus-visible:forced-focus',
              'data-disabled:bg-cloth-shade data-disabled:hover:shadow-cut',
            )}
          />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
      {minLabel || maxLabel ? (
        <div aria-hidden className="flex justify-between text-xs text-ink-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </SliderPrimitive.Root>
  )
}
