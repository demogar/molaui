'use client'

import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../../lib/cn'

import { formatDuration, useElapsed } from './use-elapsed'

/**
 * Every state a unit of model work can be in — a run, a step, a tool call.
 * One vocabulary for all three, so "waiting" on a tool call and "waiting" on
 * the run that contains it are the same mark and the same word.
 */
export type RunStatusValue =
  | 'queued'
  | 'running'
  | 'streaming'
  | 'waiting'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'timed_out'

export const RUN_STATUS_LABEL: Record<RunStatusValue, string> = {
  queued: 'Queued',
  running: 'Running',
  streaming: 'Streaming',
  waiting: 'Needs approval',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
  timed_out: 'Timed out',
}

/** Work is still open: the clock is ticking and the operator can cancel. */
export function isActiveStatus(status: RunStatusValue): boolean {
  return status === 'queued' || status === 'running' || status === 'streaming' || status === 'waiting'
}

/** Work is over and will not change again without a retry. */
export function isTerminalStatus(status: RunStatusValue): boolean {
  return !isActiveStatus(status)
}

/** A failure the operator can do something about. */
export function isRetryableStatus(status: RunStatusValue): boolean {
  return status === 'failed' || status === 'timed_out' || status === 'cancelled'
}

/**
 * The glyph. Square, because nothing in this system is round except a dot
 * that has to be a dot; keylined, because every mark is a cut shape.
 *
 * Each status differs in SHAPE, not only in hue, so the set survives
 * greyscale, a colour-blind reader and a screenshot pasted into a monochrome
 * ticket:
 *
 *   queued      hollow                 — cut, nothing revealed yet
 *   running     working relleno        — slits sliding past: size unknown
 *   streaming   working relleno, añil  — the same, but output is arriving
 *   waiting     gold, half filled      — the run is holding for a person
 *   succeeded   filled verde           — the layer fully revealed
 *   failed      filled rojo + cross
 *   cancelled   hollow + slash         — stopped by a person, not broken
 *   timed_out   hollow + rojo foot     — ran out rather than broke
 */
export function RunStatusGlyph({
  status,
  className,
}: {
  status: RunStatusValue
  className?: string
}) {
  const base = 'relative inline-block size-[0.8125em] shrink-0 overflow-hidden shadow-cut'
  switch (status) {
    case 'queued':
      return <span aria-hidden data-status={status} className={cn(base, 'bg-cloth-pale', className)} />
    case 'running':
      return <span aria-hidden data-status={status} className={cn(base, 'band-oro relleno-working', className)} />
    case 'streaming':
      return <span aria-hidden data-status={status} className={cn(base, 'band-anil relleno-working', className)} />
    case 'waiting':
      return (
        <span
          aria-hidden
          data-status={status}
          className={cn(base, 'bg-cloth-pale', 'after:absolute after:inset-x-0 after:bottom-0 after:h-1/2 after:bg-oro', className)}
        />
      )
    case 'succeeded':
      return <span aria-hidden data-status={status} className={cn(base, 'bg-verde', className)} />
    case 'failed':
      return (
        <span aria-hidden data-status={status} className={cn(base, 'bg-rojo text-on-layer', className)}>
          <svg viewBox="0 0 10 10" className="absolute inset-0 size-full">
            <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
      )
    case 'cancelled':
      return (
        <span aria-hidden data-status={status} className={cn(base, 'bg-cloth-pale text-ink-muted', className)}>
          <svg viewBox="0 0 10 10" className="absolute inset-0 size-full">
            <path d="M1 9L9 1" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>
      )
    case 'timed_out':
      return (
        <span
          aria-hidden
          data-status={status}
          className={cn(base, 'bg-cloth-pale', 'after:absolute after:inset-x-0 after:bottom-0 after:h-[30%] after:bg-rojo', className)}
        />
      )
  }
}

const labelVariants = cva('', {
  variants: {
    status: {
      queued: 'text-ink-muted',
      running: 'text-ink',
      streaming: 'text-ink',
      waiting: 'text-ink-warn',
      succeeded: 'text-ink-success',
      failed: 'text-ink-danger',
      cancelled: 'text-ink-muted',
      timed_out: 'text-ink-danger',
    },
  },
})

export interface RunStatusProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  status: RunStatusValue
  /** Override the word — e.g. "Thinking" for a running reasoning step. The glyph stays. */
  label?: string
  /** When the work started. With it, an elapsed clock follows the label. */
  startedAt?: number | Date
  /** When it ended. Freezes the clock; omit while the work is open. */
  endedAt?: number | Date
  /** A known duration, for a finished step that has no timestamps. */
  durationMs?: number
  /** `label`: the rótulo register, for headers. `inline`: sentence case, for rows and running text. */
  register?: 'label' | 'inline'
}

/**
 * Glyph + word + colour, always all three. State is never carried by colour
 * alone: a red dot means nothing to one reader in twelve, and "Failed" in
 * running text means the same thing to everyone.
 *
 * The elapsed figure is tabular and zero-padded so it ticks in place; a clock
 * that nudges the row sideways ten times a second is the jank streaming UIs
 * are known for, and it is avoidable.
 */
export function RunStatus({
  status,
  label,
  startedAt,
  endedAt,
  durationMs,
  register = 'label',
  className,
  ...props
}: RunStatusProps) {
  const active = isActiveStatus(status)
  // A finished status with no end time has no honest duration to show, so the
  // clock is frozen (passing the start as the end stops the interval) and hidden.
  const elapsed = useElapsed(startedAt, active ? endedAt : (endedAt ?? startedAt))
  const clockKnown = startedAt !== undefined && (active || endedAt !== undefined)
  const shown = durationMs ?? (clockKnown ? elapsed : undefined)

  return (
    <span
      data-slot="run-status"
      data-status={status}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap',
        register === 'label' ? 'rotulo' : 'font-ui text-sm',
        className,
      )}
      {...props}
    >
      <RunStatusGlyph status={status} className={register === 'label' ? 'size-[11px]' : undefined} />
      <span className={labelVariants({ status })}>{label ?? RUN_STATUS_LABEL[status]}</span>
      {shown !== undefined ? (
        <span className="tabular text-ink-muted normal-case tracking-normal">{formatDuration(shown)}</span>
      ) : null}
    </span>
  )
}
