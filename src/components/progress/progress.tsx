'use client'

import { Meter as MeterPrimitive } from '@base-ui/react/meter'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * Two components that look alike and mean different things, which is why they
 * are two and not one with a flag.
 *
 * `Progress` is work moving toward done: an upload, an ingest, an evaluation
 * over 300 prompts. It has `role="progressbar"`, and it can be INDETERMINATE —
 * the system's answer to which is not a looping sliver but the working
 * relleno, the same texture a loading button and a running toast carry. One
 * mark means "this is being cut" everywhere it appears.
 *
 * `Meter` is a measurement inside a known range: a token budget, a quota, a
 * disk. It has `role="meter"`, it is never indeterminate, and it has
 * THRESHOLDS — the fill steps from ink to gold to rojo as it crosses them,
 * and the thresholds are drawn on the track as ink ticks, so the operator can
 * see how close the next step is before the colour changes rather than only
 * after.
 *
 * Both share one anatomy: a label and a tabular value on one line, then a
 * cut track — cloth-shade bounded by the ink keyline — with a flat fill. The
 * value is set in tabular figures so a column of progress bars has its
 * percentages aligned.
 */

const trackClasses = 'relative block w-full overflow-hidden rounded-none bg-cloth-shade shadow-cut'
const sizeClasses = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' } as const
type Size = keyof typeof sizeClasses

export interface ProgressProps extends Omit<ProgressPrimitive.Root.Props, 'className' | 'children'> {
  className?: string
  /** Visible label; also the accessible name. Use `aria-label` when there is no room for one. */
  label?: React.ReactNode
  /** Show the formatted value at the end of the label row. Ignored while indeterminate. */
  showValue?: boolean
  /** Replaces the value text, e.g. "212 / 300 prompts". */
  valueText?: (formatted: string | null, value: number | null) => React.ReactNode
  size?: Size
  /** Fill colour. Ink is in-flight; verde/rojo for a finished state that stays on screen. */
  tone?: 'ink' | 'success' | 'danger'
}

const FILL = { ink: 'bg-ink', success: 'bg-verde', danger: 'bg-rojo' } as const

export function Progress({
  className,
  label,
  showValue = true,
  valueText,
  size = 'md',
  tone = 'ink',
  value,
  ...props
}: ProgressProps) {
  const indeterminate = value === null
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} className={cn('grid w-full gap-2', className)} {...props}>
      {label || (showValue && !indeterminate) ? (
        <div className="flex items-baseline justify-between gap-4 text-sm">
          {label ? <ProgressPrimitive.Label className="min-w-0 truncate font-ui text-ink-2">{label}</ProgressPrimitive.Label> : <span />}
          {showValue && !indeterminate ? (
            <ProgressPrimitive.Value className="font-ui font-semibold tabular-nums text-ink">
              {valueText ? (formatted, v) => valueText(formatted, v) : undefined}
            </ProgressPrimitive.Value>
          ) : null}
        </div>
      ) : null}
      <ProgressPrimitive.Track className={cn(trackClasses, sizeClasses[size])}>
        {indeterminate ? (
          <span aria-hidden className="absolute inset-0 band-oro relleno-working" />
        ) : (
          <ProgressPrimitive.Indicator
            className={cn('block h-full forced-ink transition-[width] duration-(--motion-base) ease-cut', FILL[tone])}
          />
        )}
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export interface MeterProps extends Omit<MeterPrimitive.Root.Props, 'className' | 'children'> {
  className?: string
  label?: React.ReactNode
  /**
   * Fractions of the range at which the fill changes: gold past `warn`, rojo
   * past `danger`. Drawn on the track as ticks. Pass `{}` for none.
   */
  thresholds?: { warn?: number; danger?: number }
  valueText?: (formatted: string, value: number) => React.ReactNode
  size?: Size
}

/** Which band a reading is in — exported for the stat tiles and tables that colour a number to match. */
export function meterLevel(
  value: number,
  { min = 0, max = 100, warn, danger }: { min?: number; max?: number; warn?: number; danger?: number },
): 'normal' | 'warn' | 'danger' {
  const fraction = (value - min) / (max - min)
  if (danger !== undefined && fraction >= danger) return 'danger'
  if (warn !== undefined && fraction >= warn) return 'warn'
  return 'normal'
}

const LEVEL_FILL = { normal: 'bg-ink', warn: 'bg-oro', danger: 'bg-rojo' } as const

export function Meter({
  className,
  label,
  thresholds = { warn: 0.75, danger: 0.9 },
  valueText,
  size = 'md',
  value,
  min = 0,
  max = 100,
  ...props
}: MeterProps) {
  const level = meterLevel(value, { min, max, ...thresholds })
  const ticks = [thresholds.warn, thresholds.danger].filter((t): t is number => t !== undefined)
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      data-level={level}
      value={value}
      min={min}
      max={max}
      className={cn('grid w-full gap-2', className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4 text-sm">
        {label ? <MeterPrimitive.Label className="min-w-0 truncate font-ui text-ink-2">{label}</MeterPrimitive.Label> : <span />}
        <MeterPrimitive.Value
          className={cn(
            'font-ui font-semibold tabular-nums',
            level === 'danger' ? 'text-ink-danger' : level === 'warn' ? 'text-ink-warn' : 'text-ink',
          )}
        >
          {valueText ? (formatted, v) => valueText(formatted, v) : undefined}
        </MeterPrimitive.Value>
      </div>
      <MeterPrimitive.Track className={cn(trackClasses, sizeClasses[size])}>
        <MeterPrimitive.Indicator
          className={cn('block h-full forced-ink transition-[width,background-color] duration-(--motion-base) ease-cut', LEVEL_FILL[level])}
        />
        {ticks.map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute inset-y-0 w-[1.5px] bg-ink forced-ink"
            style={{ insetInlineStart: `calc(${t * 100}% - 0.75px)` }}
          />
        ))}
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  )
}
