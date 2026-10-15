'use client'

import { Meter as MeterPrimitive } from '@base-ui/react/meter'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'

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

/**
 * The fill is the whole track scaled down from its inline start, not a
 * width. Base UI sizes the indicator with `width: n%`, and a transition on
 * `width` lays the bar out again on every frame of the ease; `scale` is the
 * same flat shape, moved by the compositor. So the width is pinned to the
 * track and the fraction becomes the scale.
 */
const fillClasses = 'block h-full origin-left rtl:origin-right forced-ink'
function fillStyle(value: number, min = 0, max = 100): React.CSSProperties {
  const fraction = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0
  return { width: '100%', scale: `${fraction} 1` }
}
export type ProgressSize = 'sm' | 'md' | 'lg'
const sizeClasses: Record<ProgressSize, string> = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

export interface ProgressProps extends Omit<ProgressPrimitive.Root.Props, 'className' | 'children'> {
  className?: string
  /** Visible label; also the accessible name. Use `aria-label` when there is no room for one. */
  label?: React.ReactNode
  /** Show the formatted value at the end of the label row. Ignored while indeterminate. */
  showValue?: boolean
  /** Replaces the value text, e.g. "212 / 300 prompts". */
  valueText?: (formatted: string | null, value: number | null) => React.ReactNode
  size?: ProgressSize
  /**
   * Fill colour. `neutral` (ink) is in-flight; `success` and `danger` (verde,
   * rojo) for a finished state that stays on screen. `ink` is deprecated
   * since 0.7.0 and removed in 1.0.0: use `neutral`, the same fill under the
   * status word every other `tone` uses.
   */
  tone?: 'neutral' | 'success' | 'danger' | 'ink'
}

const FILL = { neutral: 'bg-ink', ink: 'bg-ink', success: 'bg-verde', danger: 'bg-danger' } as const

export function Progress({
  className,
  label,
  showValue = true,
  valueText,
  size = 'md',
  tone = 'neutral',
  value,
  min,
  max,
  ...props
}: ProgressProps) {
  if (tone === 'ink') deprecate('progress-tone-ink', { what: '<Progress tone="ink">', instead: '<Progress tone="neutral">', removal: '1.0.0' })
  const indeterminate = value === null
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} min={min} max={max} className={cn('grid w-full gap-2', className)} {...props}>
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
          <span aria-hidden className="absolute inset-0 band-accent relleno-working" />
        ) : (
          <ProgressPrimitive.Indicator
            className={cn(fillClasses, 'transition-[scale] duration-(--motion-base)', FILL[tone])}
            style={fillStyle(value, min, max)}
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
  size?: ProgressSize
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

const LEVEL_FILL = { normal: 'bg-ink', warn: 'bg-oro', danger: 'bg-danger' } as const

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
          className={cn(fillClasses, 'transition-[scale,background-color] duration-(--motion-base)', LEVEL_FILL[level])}
          style={fillStyle(value, min, max)}
        />
        {ticks.map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute inset-y-0 w-(--cut-w) bg-ink forced-ink"
            style={{ insetInlineStart: `calc(${t * 100}% - 0.75px)` }}
          />
        ))}
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  )
}
