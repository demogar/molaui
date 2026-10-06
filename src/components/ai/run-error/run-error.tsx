import { Check, Copy, RotateCcw, StepForward } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { Button } from '../../button'
import { RunStatus, type RunStatusValue } from '../run-status'

import { formatCountdown, spokenCountdown, useCountdown } from './use-countdown'

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

const LABEL: Record<RunErrorKind, string> = {
  failed: 'Failed',
  rate_limited: 'Rate limited',
  timed_out: 'Timed out',
  cancelled: 'Cancelled',
}

export interface RunErrorProps extends Omit<React.ComponentProps<'div'>, 'children' | 'title'> {
  kind?: RunErrorKind
  /** The step that stopped, in words — "Break the result down by cohort". */
  step?: string
  /** The step's position, counted from 1. Shown as "step 4 of 5" and used to name *Retry from step 4*. */
  stepNumber?: number
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
  onRetry?: () => void
  onRetryFromStep?: () => void
  /** Offer *Copy error details*. On by default except for a cancellation, which is not an error. */
  copyable?: boolean
}

function plainSentence(kind: RunErrorKind, tool: string | undefined): string {
  switch (kind) {
    case 'failed':
      return `${tool ? `${tool} returned an error` : 'The step returned an error'}, so the run stopped. Work before this step is kept.`
    case 'rate_limited':
      return 'The model provider turned the request away because this workspace sent too many in a short time. Nothing is broken, and work before this step is kept.'
    case 'timed_out':
      return `${tool ? `${tool} did not answer` : 'The step did not finish'} in time. What arrived before the deadline is kept.`
    case 'cancelled':
      return 'You stopped the run. Nothing after this step ran, and what arrived before it is kept.'
  }
}

/** The plain-text block *Copy error details* puts on the clipboard: everything a ticket needs, one fact per line. */
export function formatRunErrorDetails({
  kind = 'failed',
  step,
  stepNumber,
  stepCount,
  tool,
  error,
  runId,
  at,
}: Pick<RunErrorProps, 'kind' | 'step' | 'stepNumber' | 'stepCount' | 'tool' | 'error' | 'runId' | 'at'>): string {
  const where = stepNumber !== undefined ? `${stepNumber}${stepCount ? ` of ${stepCount}` : ''}${step ? ` — ${step}` : ''}` : step
  return [
    `Status: ${LABEL[kind]}`,
    runId ? `Run: ${runId}` : undefined,
    where ? `Step: ${where}` : undefined,
    tool ? `Tool: ${tool}` : undefined,
    error ? `Error: ${error}` : undefined,
    at !== undefined ? `At: ${new Date(at).toISOString()}` : undefined,
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
  className,
  ...props
}: RunErrorProps) {
  const headlineId = React.useId()
  const remaining = useCountdown(retryAt)
  const counting = remaining !== undefined && remaining > 0
  const alarm = kind !== 'cancelled'

  // Announced once with the error itself, frozen at mount: the alert must not
  // change while it is being read.
  const [startFigure] = React.useState(() => (remaining !== undefined ? spokenCountdown(remaining) : undefined))
  const milestone = remaining === undefined ? 'none' : remaining <= 0 ? 'zero' : remaining <= 10_000 ? 'ten' : 'start'
  const [prevMilestone, setPrevMilestone] = React.useState(milestone)
  const [announcement, setAnnouncement] = React.useState('')
  if (milestone !== prevMilestone) {
    setPrevMilestone(milestone)
    if (milestone === 'ten') setAnnouncement(autoRetry ? 'Retrying in 10 seconds.' : 'You can retry in 10 seconds.')
    else if (milestone === 'zero') setAnnouncement(autoRetry ? 'Retrying now.' : 'You can retry now.')
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
      ? `step ${stepNumber}${stepCount ? ` of ${stepCount}` : ''}`
      : undefined
  // The status line above already says why, so the headline says where.
  const headline = where || step ? `Stopped at ${where ?? ''}${where && step ? ': ' : ''}${step ?? ''}.` : `The run ${LABEL[kind].toLowerCase()}.`
  const blocked = counting && !autoRetry

  const body = (
    <>
      <p id={headlineId} className="m-0 font-ui text-sm leading-snug font-semibold text-ink">
        {headline}
      </p>
      <p className="m-0 font-ui text-sm leading-snug text-ink-2">{message ?? plainSentence(kind, tool)}</p>
      {error ? (
        <p className="m-0 literal text-xs leading-relaxed text-ink [overflow-wrap:anywhere]">
          <span dir="ltr">{error}</span>
        </p>
      ) : null}
      {startFigure ? (
        <span className="sr-only">
          {autoRetry ? `Retrying automatically in ${startFigure}.` : `You can retry in ${startFigure}.`}
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
          ? 'bg-rojo-soft shadow-[inset_3px_0_0_var(--rojo)] rtl:shadow-[inset_-3px_0_0_var(--rojo)]'
          : 'bg-cloth-shade shadow-[inset_3px_0_0_var(--ink-muted)] rtl:shadow-[inset_-3px_0_0_var(--ink-muted)]',
        // Forced colours drop the wash and the rule; a keyline keeps the panel a panel.
        'forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1',
        className,
      )}
      {...props}
    >
      {alarm ? (
        <div role="alert" className="flex flex-col gap-1.5">
          <RunStatus status={STATUS[kind]} label={LABEL[kind]} className="mb-1" />
          {body}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <RunStatus status={STATUS[kind]} label={LABEL[kind]} className="mb-1" />
          {body}
        </div>
      )}

      {remaining !== undefined ? (
        <p className="m-0 font-ui text-sm text-ink">
          {counting ? (
            <>
              {autoRetry ? 'Retrying automatically in ' : 'You can retry in '}
              <span className="tabular font-semibold">{formatCountdown(remaining)}</span>.
            </>
          ) : autoRetry ? (
            'Retrying now.'
          ) : (
            'You can retry now.'
          )}
        </p>
      ) : null}

      {onRetryFromStep || onRetry || copyable ? (
        <div className="flex flex-wrap gap-2">
          {onRetryFromStep ? (
            <Button
              size="sm"
              variant={alarm ? 'primary' : 'secondary'}
              icon={<StepForward className="rtl:-scale-x-100" />}
              disabled={blocked}
              onClick={onRetryFromStep}
              aria-describedby={headlineId}
            >
              {stepNumber !== undefined ? `Retry from step ${stepNumber}` : 'Retry from this step'}
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
              Retry run
            </Button>
          ) : null}
          {copyable ? (
            <CopyDetails text={formatRunErrorDetails({ kind, step, stepNumber, stepCount, tool, error, runId, at })} />
          ) : null}
        </div>
      ) : null}

      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

function CopyDetails({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
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
        Copy error details
      </Button>
      <span role="status" className="sr-only">
        {copied ? 'Error details copied.' : ''}
      </span>
    </>
  )
}

export interface PartialOutputProps extends React.ComponentProps<'div'> {
  /** What cut it short, in words. Defaults to a plain statement. */
  note?: React.ReactNode
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
export function PartialOutput({ note, className, children, ...props }: PartialOutputProps) {
  return (
    <div data-slot="partial-output" className={cn('flex flex-col gap-2', className)} {...props}>
      <p className="m-0 rotulo text-ink-muted">Partial output</p>
      <div className="min-w-0">{children}</div>
      <p className="m-0 flex items-center gap-2 font-ui text-xs text-ink-muted">
        <span aria-hidden className="h-[1.5px] w-6 shrink-0 bg-ink-muted forced-ink" />
        {note ?? 'Output stops here. The rest never arrived.'}
      </p>
    </div>
  )
}
