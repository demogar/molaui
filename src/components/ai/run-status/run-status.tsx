'use client'

import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessagesOverride, useMessages } from '../../../lib/messages'

import { type RunStatusMessages, runStatusMessages } from './messages'
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

// The English word for each status, kept as an export for code that read it
// before the words became translatable; the components read
// `runStatus.statuses` through `MessagesProvider` instead. A line comment, not
// JSDoc, and a copy: Storybook's docgen annotates a documented export as if it
// were a component, and it wrote `displayName` and `__docgenInfo` into the
// shared table, which the stories read as two more statuses.
export const RUN_STATUS_LABEL: Record<RunStatusValue, string> = { ...runStatusMessages.statuses }

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
export interface RunStatusGlyphProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /**
   * Which mark to draw. Each status has its own shape, not only its own hue, so
   * the glyph survives greyscale. Decorative: pair it with the word, as
   * `RunStatus` does.
   */
  status: RunStatusValue
}

const GLYPH: Record<RunStatusValue, { className: string; mark?: React.ReactNode }> = {
  queued: { className: 'bg-cloth-pale' },
  running: { className: 'band-accent relleno-working' },
  streaming: { className: 'band-anil relleno-working' },
  waiting: { className: 'bg-cloth-pale after:absolute after:inset-x-0 after:bottom-0 after:h-1/2 after:bg-oro' },
  succeeded: { className: 'bg-verde' },
  failed: {
    className: 'bg-danger text-on-layer',
    mark: <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.6" />,
  },
  cancelled: {
    className: 'bg-cloth-pale text-ink-muted',
    mark: <path d="M1 9L9 1" stroke="currentColor" strokeWidth="1.4" />,
  },
  timed_out: { className: 'bg-cloth-pale after:absolute after:inset-x-0 after:bottom-0 after:h-[30%] after:bg-danger' },
}

/** `className`, `ref` and the rest of the DOM props go to the glyph's `<span>`. */
export function RunStatusGlyph({ status, className, ...props }: RunStatusGlyphProps) {
  const { className: look, mark } = GLYPH[status]
  return (
    <span
      aria-hidden
      {...props}
      data-slot="run-status-glyph"
      data-part="glyph"
      data-status={status}
      className={cn('relative inline-block size-[0.8125em] shrink-0 overflow-hidden shadow-cut', look, className)}
    >
      {mark ? (
        <svg viewBox="0 0 10 10" className="absolute inset-0 size-full">
          {mark}
        </svg>
      ) : null}
    </span>
  )
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
  /**
   * The state shown: it picks the glyph, the word (unless `label` overrides it)
   * and its colour, and whether the clock keeps running.
   */
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
  /** Words for translation: the word for each status. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<RunStatusMessages>
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
  messages,
  className,
  ...props
}: RunStatusProps) {
  const [t] = useMessages('runStatus', runStatusMessages, messages)
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
      <span data-part="label" className={labelVariants({ status })}>{label ?? t.statuses[status]}</span>
      {shown !== undefined ? (
        <span data-part="duration" className="tabular text-ink-muted normal-case tracking-normal">{formatDuration(shown)}</span>
      ) : null}
    </span>
  )
}
