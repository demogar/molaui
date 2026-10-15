'use client'

import { Check, Copy, RotateCcw, StepForward } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { formatMessage, type MessageFormat, type MessagesOverride, useMessages } from '../../../lib/messages'
import { Button } from '../../button'
import { RunStatus, type RunStatusValue } from '../run-status'

import { type PartialOutputMessages, type RunErrorMessages, partialOutputMessages, runErrorMessages } from './messages'
import { formatCountdown, useCountdown } from './use-countdown'

/**
 * Why a run stopped. Four reasons, because the operator's next move differs
 * for each: a failure needs reading, a rate limit needs waiting, a timeout
 * may need a smaller request, and a cancellation needs nothing at all.
 *
 * A rate limit is a reason, not a `RunStatusValue`. Status is the one
 * vocabulary every run, step and call shares, and each value has its own
 * glyph; a rate-limited run is a failed run with a known cause and a known
 * wait, so it keeps the failed mark and says "Rate limited" in words. A ninth
 * status would have meant a ninth shape every reader has to learn, for a
 * difference the sentence already states.
 */
export type RunErrorKind = 'failed' | 'rate_limited' | 'timed_out' | 'cancelled'

const STATUS: Record<RunErrorKind, RunStatusValue> = {
  failed: 'failed',
  rate_limited: 'failed',
  timed_out: 'timed_out',
  cancelled: 'cancelled',
}

export interface RunErrorProps extends Omit<React.ComponentProps<'div'>, 'children' | 'title'> {
  /**
   * Why the run stopped, which sets the headline, the plain sentence and the
   * glyph. Defaults to `failed`; `cancelled` is not an error, so it offers no copy
   * action.
   */
  kind?: RunErrorKind
  /** The step that stopped, in words — "Break the result down by plan". */
  step?: string
  /** The step's position, counted from 1. Shown as "step 4 of 5" and used to name *Retry from step 4*. */
  stepNumber?: number
  /**
   * How many steps the run has, so the position reads "step 4 of 5". Only used
   * with `stepNumber`.
   */
  stepCount?: number
  /** The tool that failed, exactly as the model called it. */
  tool?: string
  /** The error, verbatim. */
  error?: string
  /** Replaces the plain sentence under the headline. */
  message?: React.ReactNode
  /** The run id, for the copied details. */
  runId?: string
  /** When it stopped, for the copied details. */
  at?: number | Date
  /** When a retry is allowed (or will happen). Shows a countdown. */
  retryAt?: number | Date
  /** At `retryAt`, retry by itself instead of re-enabling the buttons. */
  autoRetry?: boolean
  /**
   * Runs the whole run again from the start. Shows *Retry run*, disabled until
   * `retryAt` passes.
   */
  onRetry?: () => void
  /**
   * Re-runs from the step that stopped, keeping the work before it, so it takes
   * the stronger button when both retries are offered. Disabled until `retryAt`
   * passes.
   */
  onRetryFromStep?: () => void
  /** Offer *Copy error details*. On by default except for a cancellation, which is not an error. */
  copyable?: boolean
  /**
   * Words for translation: the status words, the sentences, the countdown,
   * the buttons and the copied details. Keys left out come from
   * `MessagesProvider`, then English.
   */
  messages?: MessagesOverride<RunErrorMessages>
}

function plainSentence(kind: RunErrorKind, tool: string | undefined, t: RunErrorMessages): string {
  switch (kind) {
    case 'failed':
      return tool ? formatMessage(t.failedTool, { tool }) : t.failed
    case 'rate_limited':
      return t.rateLimited
    case 'timed_out':
      return tool ? formatMessage(t.timedOutTool, { tool }) : t.timedOut
    case 'cancelled':
      return t.cancelled
  }
}

/** The same figure as `formatCountdown`, spelled out for a screen reader: "1 minute 5 seconds". */
function spokenCountdown(ms: number, t: RunErrorMessages, f: MessageFormat): string {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return f.plural(t.seconds, s)
  const rest = s % 60
  const minutes = f.plural(t.minutes, Math.floor(s / 60))
  return rest === 0 ? minutes : f.format(t.minutesAndSeconds, { minutes, seconds: f.plural(t.seconds, rest) })
}

/**
 * The plain-text block *Copy error details* puts on the clipboard: everything
 * a ticket needs, one fact per line. In English unless `messages` (a full
 * RunError table, `defaultMessages.runError` with your keys) says otherwise:
 * this is a plain function, so it cannot read `MessagesProvider`.
 */
export function formatRunErrorDetails(
  {
    kind = 'failed',
    step,
    stepNumber,
    stepCount,
    tool,
    error,
    runId,
    at,
  }: Pick<RunErrorProps, 'kind' | 'step' | 'stepNumber' | 'stepCount' | 'tool' | 'error' | 'runId' | 'at'>,
  messages: RunErrorMessages = runErrorMessages,
): string {
  const t = messages
  const where =
    stepNumber !== undefined
      ? `${stepCount ? formatMessage(t.detailsStepOf, { n: stepNumber, count: stepCount }) : stepNumber}${step ? ` — ${step}` : ''}`
      : step
  return [
    formatMessage(t.detailsStatus, { value: t.kinds[kind] }),
    runId ? formatMessage(t.detailsRun, { value: runId }) : undefined,
    where ? formatMessage(t.detailsStep, { value: where }) : undefined,
    tool ? formatMessage(t.detailsTool, { value: tool }) : undefined,
    error ? formatMessage(t.detailsError, { value: error }) : undefined,
    at !== undefined ? formatMessage(t.detailsAt, { value: new Date(at).toISOString() }) : undefined,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * What stopped a run, said plainly, with the way back next to it.
 *
 * ── the sentence, then the literal ──
 * The status line says why the run stopped (Failed, Rate limited…) and the
 * headline says where, naming the step by number and in words so it can be
 * matched to the timeline. Under it, one sentence says what happened in the
 * operator's language, and the error itself follows verbatim as a literal —
 * `dir="ltr"`, because a stack-trace-shaped string reordered by a
 * right-to-left paragraph is no longer the string the tool returned. "Something
 * went wrong" is not on the list of sentences.
 *
 * ── three ways back, in order of cost ──
 * *Retry from step N* re-runs only the step that failed and what follows,
 * keeping the work before it, so it is the primary action. *Retry run* starts
 * again from nothing. *Copy error details* puts run, step, tool, error and
 * time on the clipboard as plain text, for the ticket, and says so once.
 *
 * ── a countdown, announced at milestones ──
 * A rate limit or timeout can carry `retryAt`. The figure ticks in tabular
 * numerals, in ordinary text rather than a live region: a region that
 * re-reads "23 seconds, 22 seconds…" makes a screen reader unusable for the
 * whole wait. The wait is announced three times — with the error, at ten
 * seconds left, and at zero — which is when an operator's decision changes.
 * Without `autoRetry` the retry buttons stay disabled until zero, and the
 * sentence says why: disabled is stated, not faded.
 *
 * ── a cancellation is not an error ──
 * Stopped by a person, so no rojo wash, no alert, nothing to copy; the run
 * announces "Run cancelled." itself. The panel is still there because the
 * question "what happens if I start it again" still is.
 */
export function RunError({
  kind = 'failed',
  step,
  stepNumber,
  stepCount,
  tool,
  error,
  message,
  runId,
  at,
  retryAt,
  autoRetry = false,
  onRetry,
  onRetryFromStep,
  copyable = kind !== 'cancelled',
  messages,
  className,
  ...props
}: RunErrorProps) {
  const [t, f] = useMessages('runError', runErrorMessages, messages)
  const headlineId = React.useId()
  const remaining = useCountdown(retryAt)
  const counting = remaining !== undefined && remaining > 0
  const alarm = kind !== 'cancelled'

  // Announced once with the error itself, frozen at the first figure known:
  // the alert must not change while it is being read. That is the first
  // render on a client-only mount; after server rendering the countdown is
  // unknown until hydration ends (see `useCountdown`), so the figure is
  // captured on the render after.
  const [startFigure, setStartFigure] = React.useState(() =>
    remaining !== undefined ? spokenCountdown(remaining, t, f) : undefined,
  )
  if (startFigure === undefined && remaining !== undefined) setStartFigure(spokenCountdown(remaining, t, f))
  // 'pending': there is a target but no clock yet. Leaving it is the figure
  // arriving, not a milestone passing, so it announces nothing.
  const milestone =
    remaining === undefined
      ? retryAt === undefined
        ? 'none'
        : 'pending'
      : remaining <= 0
        ? 'zero'
        : remaining <= 10_000
          ? 'ten'
          : 'start'
  const [prevMilestone, setPrevMilestone] = React.useState(milestone)
  const [announcement, setAnnouncement] = React.useState('')
  if (milestone !== prevMilestone) {
    setPrevMilestone(milestone)
    if (prevMilestone === 'pending') {
      // The first figure, already said by the alert.
    } else if (milestone === 'ten') setAnnouncement(autoRetry ? t.retryingInTen : t.canRetryInTen)
    else if (milestone === 'zero') setAnnouncement(autoRetry ? t.retryingNow : t.canRetryNow)
  }

  // One automatic retry per target time, even if the parent re-renders at zero.
  const firedFor = React.useRef<number | undefined>(undefined)
  const retry = onRetryFromStep ?? onRetry
  React.useEffect(() => {
    if (!autoRetry || remaining !== 0 || retryAt === undefined) return
    if (firedFor.current === +retryAt) return
    firedFor.current = +retryAt
    retry?.()
  }, [autoRetry, remaining, retryAt, retry])

  const where =
    stepNumber !== undefined
      ? stepCount
        ? f.format(t.stepOf, { n: stepNumber, count: stepCount })
        : f.format(t.step, { n: stepNumber })
      : undefined
  // The status line above already says why, so the headline says where.
  const place = where && step ? f.format(t.place, { where, step }) : (where ?? step)
  const headline = place ? f.format(t.stoppedAt, { place }) : t.headlines[kind]
  // Until the clock is known the wait is assumed to be on: an enabled Retry
  // in server HTML that turns disabled on hydration would be a promise taken back.
  const blocked = (counting || milestone === 'pending') && !autoRetry

  const body = (
    <>
      <p id={headlineId} className="m-0 font-ui text-sm leading-snug font-semibold text-ink">
        {headline}
      </p>
      <p className="m-0 font-ui text-sm leading-snug text-ink-2">{message ?? plainSentence(kind, tool, t)}</p>
      {error ? (
        <p className="m-0 literal text-xs leading-body text-ink [overflow-wrap:anywhere]">
          <span dir="ltr">{error}</span>
        </p>
      ) : null}
      {startFigure ? (
        <span className="sr-only">
          {f.format(autoRetry ? t.retryingIn : t.canRetryIn, { time: startFigure })}
        </span>
      ) : null}
    </>
  )

  return (
    <div
      data-slot="run-error"
      data-kind={kind}
      role="group"
      aria-labelledby={headlineId}
      className={cn(
        'flex flex-col gap-3 px-4 py-3.5',
        alarm
          ? 'bg-danger-soft bar-start-danger'
          : 'bg-cloth-shade bar-start-ink-muted',
        // Forced colours drop the wash and the rule; a keyline keeps the panel a panel.
        'forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1',
        className,
      )}
      {...props}
    >
      {alarm ? (
        <div role="alert" className="flex flex-col gap-1.5">
          <RunStatus status={STATUS[kind]} label={t.kinds[kind]} className="mb-1" />
          {body}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <RunStatus status={STATUS[kind]} label={t.kinds[kind]} className="mb-1" />
          {body}
        </div>
      )}

      {milestone === 'pending' ? (
        <p className="m-0 font-ui text-sm text-ink">
          {autoRetry ? t.retryingAfterWait : t.canRetryAfterWait}
        </p>
      ) : null}
      {remaining !== undefined ? (
        <p className="m-0 font-ui text-sm text-ink">
          {counting
            ? f.nodes(autoRetry ? t.retryingIn : t.canRetryIn, {
                time: <span className="tabular font-semibold">{formatCountdown(remaining)}</span>,
              })
            : autoRetry
              ? t.retryingNow
              : t.canRetryNow}
        </p>
      ) : null}

      {onRetryFromStep || onRetry || copyable ? (
        <div className="flex flex-wrap gap-2">
          {onRetryFromStep ? (
            <Button
              size="sm"
              variant={alarm ? 'primary' : 'secondary'}
              icon={<StepForward className="flip-rtl" />}
              disabled={blocked}
              onClick={onRetryFromStep}
              aria-describedby={headlineId}
            >
              {stepNumber !== undefined ? f.format(t.retryFromStep, { n: stepNumber }) : t.retryFromThisStep}
            </Button>
          ) : null}
          {onRetry ? (
            <Button
              size="sm"
              variant={alarm && !onRetryFromStep ? 'primary' : 'secondary'}
              icon={<RotateCcw />}
              disabled={blocked}
              onClick={onRetry}
            >
              {t.retryRun}
            </Button>
          ) : null}
          {copyable ? (
            <CopyDetails text={formatRunErrorDetails({ kind, step, stepNumber, stepCount, tool, error, runId, at }, t)} t={t} />
          ) : null}
        </div>
      ) : null}

      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

function CopyDetails({ text, t }: { text: string; t: RunErrorMessages }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon={copied ? <Check /> : <Copy />}
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => setCopied(true))
        }}
      >
        {t.copyDetails}
      </Button>
      <span role="status" className="sr-only">
        {copied ? t.detailsCopied : ''}
      </span>
    </>
  )
}

export interface PartialOutputProps extends React.ComponentProps<'div'> {
  /** What cut it short, in words. Defaults to a plain statement. */
  note?: React.ReactNode
  /** Words for translation: the label and the default note. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<PartialOutputMessages>
}

/**
 * Output that stopped arriving before it was finished — kept, and marked.
 *
 * Throwing away the half an answer that arrived before a failure throws away
 * the only thing the run produced, and the operator often needs only that
 * half. Keeping it unmarked is worse: a paragraph that stops mid-sentence
 * reads as the model's conclusion. So it stays, with a label above saying it
 * is partial and a rule below saying where it ends.
 */
export function PartialOutput({ note, messages, className, children, ...props }: PartialOutputProps) {
  const [t] = useMessages('partialOutput', partialOutputMessages, messages)
  return (
    <div data-slot="partial-output" className={cn('flex flex-col gap-2', className)} {...props}>
      <p className="m-0 rotulo text-ink-muted">{t.label}</p>
      <div className="min-w-0">{children}</div>
      <p className="m-0 flex items-center gap-2 font-ui text-xs text-ink-muted">
        <span aria-hidden className="h-(--cut-w) w-6 shrink-0 bg-ink-muted forced-ink" />
        {note ?? t.note}
      </p>
    </div>
  )
}
