'use client'

import { Check, MessageSquareWarning, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessagesOverride, formatMessage, useMessages } from '../../../lib/messages'
import { useControllable } from '../../../lib/use-controllable'
import { Button } from '../../button'
import { Field, Textarea } from '../../field'
import { RunStatusGlyph } from '../run-status'
import {
  type ChangeReviewMessages,
  type FieldChangesMessages,
  changeReviewMessages,
  fieldChangesMessages,
} from './messages'

export type ChangeDecisionStatus = 'approved' | 'changes_requested' | 'rejected'

export interface ChangeDecision {
  status: ChangeDecisionStatus
  /** Required for `rejected` and `changes_requested`; optional for `approved`. */
  reason?: string
}

// The run-status mark that means the same thing, so a decision and the run
// it unblocks share one shape: done, held, stopped.
const DECISION_GLYPH = { approved: 'succeeded', changes_requested: 'waiting', rejected: 'failed' } as const
const DECISION_INK: Record<ChangeDecisionStatus, string> = {
  approved: 'text-ink-success',
  changes_requested: 'text-ink-warn',
  rejected: 'text-ink-danger',
}

export interface ChangeReviewProps extends Omit<React.ComponentProps<'section'>, 'children' | 'title'> {
  /** What the change does, in words — "Roll the help panel out to Starter". */
  title: React.ReactNode
  /** Who proposed it — "Cayuco research agent". */
  agent: string
  /** The model identifier, set as a literal. */
  model?: string
  /** The agent's explanation of the change, in its own words. Set as prose. */
  summary?: React.ReactNode
  /** The change itself: `FileDiff`s, `FieldChanges`, or both. */
  children?: React.ReactNode
  /** Controlled decision. `null` means undecided. */
  decision?: ChangeDecision | null
  /** Uncontrolled starting decision. */
  defaultDecision?: ChangeDecision | null
  /** Called with a valid decision only: never for a rejection without a reason. */
  onDecide?: (status: ChangeDecisionStatus, reason: string | undefined) => void
  /** Who decided, shown with the outcome — "M. Herrera". */
  reviewer?: string
  /**
   * Heading level for the proposal's title. Defaults to 3; use 2 when the review
   * is the page's main subject.
   */
  headingLevel?: 2 | 3
  /** Words for translation: the decisions, the reason field and the header labels. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<ChangeReviewMessages>
}

/**
 * An agent proposes a change; a person reviews it and decides.
 *
 * ── three decisions, one weight ──
 * Approve, Request changes and Reject are the same size, the same variant and
 * sit in the same row, each with a glyph and a word. A review screen that
 * makes Approve the ink button and Reject a quiet link has decided for the
 * reviewer, and on a change an agent will apply to the world, a nudged
 * approval is a defect, not a conversion win. Reject is not red either: red
 * here would read as "dangerous", and rejecting is the safe choice.
 *
 * ── a no needs a reason ──
 * Reject and Request changes need a reason, because the agent acts on it: it
 * revises the change or stops proposing it. Pressing either with the reason
 * empty says what is missing in words, moves focus to the field, and does not
 * call `onDecide`. The field is always visible rather than revealed by the
 * button, so nobody discovers the requirement by failing it — the hint states
 * it up front.
 *
 * ── the outcome replaces the form ──
 * Once decided, the buttons go: a decision left next to live buttons invites
 * a second click that means nothing. The outcome — glyph, word, reason, who —
 * takes the form's place and takes focus, so keyboard and screen reader users
 * land on it and hear it once. It is not also a live region: focus already
 * announces it, and a region would say it twice.
 */
export function ChangeReview({
  title,
  agent,
  model,
  summary,
  children,
  decision: decisionProp,
  defaultDecision = null,
  onDecide,
  reviewer,
  headingLevel = 3,
  messages,
  className,
  ...props
}: ChangeReviewProps) {
  const [t, f] = useMessages('changeReview', changeReviewMessages, messages)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const headingId = React.useId()
  const [decision, setDecision] = useControllable<ChangeDecision | null>({
    value: decisionProp,
    defaultValue: defaultDecision,
    onChange: (next) => {
      if (next) onDecide?.(next.status, next.reason)
    },
  })

  const outcomeRef = React.useRef<HTMLDivElement>(null)
  // Focus moves only after a decision made here, not when one arrives already
  // made: a page that loads a reviewed change must not steal focus.
  const decidedHere = React.useRef(false)
  React.useEffect(() => {
    if (decision && decidedHere.current) {
      decidedHere.current = false
      outcomeRef.current?.focus()
    }
  }, [decision])

  const decide = (status: ChangeDecisionStatus, reason: string | undefined) => {
    decidedHere.current = true
    setDecision({ status, ...(reason ? { reason } : {}) })
  }

  return (
    <section
      data-slot="change-review"
      data-decision={decision?.status ?? 'pending'}
      aria-labelledby={headingId}
      className={cn('flex flex-col bg-cloth-pale cut-frame nested:bg-cloth forced-colors:p-px', className)}
      {...props}
    >
      <header className="flex flex-col gap-2 border-b border-keyline p-4">
        <p className="m-0 rotulo text-ink-muted">{t.proposedChange}</p>
        <Heading id={headingId} className="m-0 font-display text-lg leading-snug font-bold tracking-display wdth-display">
          {title}
        </Heading>
        <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-ui text-sm text-ink-2">
          <span>{f.nodes(t.proposedBy, { agent: <span className="font-semibold text-ink">{agent}</span> })}</span>
          {model ? (
            <span dir="ltr" className="literal text-xs text-ink-muted">
              {model}
            </span>
          ) : null}
        </p>
        {summary ? <div className="mt-1 max-w-reading font-text text-base leading-body text-ink">{summary}</div> : null}
      </header>

      {children ? <div className="flex flex-col gap-3 p-4">{children}</div> : null}

      <div className="border-t border-keyline p-4">
        {decision ? (
          <Outcome ref={outcomeRef} decision={decision} reviewer={reviewer} t={t} />
        ) : (
          <DecisionForm onDecide={decide} t={t} />
        )}
      </div>
    </section>
  )
}

function DecisionForm({
  onDecide,
  t,
}: {
  onDecide: (status: ChangeDecisionStatus, reason: string | undefined) => void
  t: ChangeReviewMessages
}) {
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | undefined>()
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)

  const press = (status: ChangeDecisionStatus) => {
    const trimmed = reason.trim()
    if (status !== 'approved' && trimmed === '') {
      setError(t.missingReason[status])
      fieldRef.current?.focus()
      return
    }
    setError(undefined)
    onDecide(status, trimmed === '' ? undefined : trimmed)
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={t.reason} hint={t.reasonHint} error={error}>
        {(control) => (
          <Textarea
            {...control}
            ref={fieldRef}
            rows={2}
            autosize
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error && e.target.value.trim() !== '') setError(undefined)
            }}
          />
        )}
      </Field>
      <div role="group" aria-label={t.decision} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="secondary" icon={<Check />} onClick={() => press('approved')}>
          {t.actions.approved}
        </Button>
        <Button variant="secondary" icon={<MessageSquareWarning />} onClick={() => press('changes_requested')}>
          {t.actions.changes_requested}
        </Button>
        <Button variant="secondary" icon={<X />} onClick={() => press('rejected')}>
          {t.actions.rejected}
        </Button>
      </div>
    </div>
  )
}

function Outcome({
  ref,
  decision,
  reviewer,
  t,
}: {
  ref: React.Ref<HTMLDivElement>
  decision: ChangeDecision
  reviewer?: string
  t: ChangeReviewMessages
}) {

  return (
    <div ref={ref} tabIndex={-1} data-slot="change-decision" className="flex items-start gap-3 outline-none">
      <RunStatusGlyph status={DECISION_GLYPH[decision.status]} className="mt-1 size-[13px]" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 font-ui text-sm font-semibold">
          <span className={DECISION_INK[decision.status]}>{t.decisions[decision.status]}</span>
          {reviewer ? <span className="font-normal text-ink-2"> {formatMessage(t.decidedBy, { reviewer })}</span> : null}
        </p>
        {decision.reason ? (
          <p className="m-0 max-w-reading font-text text-base leading-body text-ink">{decision.reason}</p>
        ) : null}
      </div>
    </div>
  )
}

export interface FieldChange {
  /** The field's key, exactly as the system stores it. Set as a literal. */
  field: string
  /** The value before. Omit for a field the change adds. */
  before?: React.ReactNode
  /** The value after. Omit for a field the change removes. */
  after?: React.ReactNode
}

export interface FieldChangesProps extends Omit<React.ComponentProps<'section'>, 'children' | 'title'> {
  /** What the record is — "Feature flag help_panel_v2". */
  title: React.ReactNode
  /**
   * The fields that changed, each as before → after. Leave out the fields that did
   * not change: the list is the change, not the record.
   */
  changes: readonly FieldChange[]
  /**
   * Heading level for the record's title. Defaults to 4, under a `ChangeReview`
   * heading.
   */
  headingLevel?: 3 | 4 | 5
  /** Words for translation: the count and the before/after words. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<FieldChangesMessages>
}

/**
 * A change to a record rather than a file: a feature flag, a customer's plan,
 * a schedule. Each field reads before → after.
 *
 * A diff of the record's JSON was the first idea and the wrong one: it shows
 * the reviewer braces and commas, and reorders what changed among what did
 * not. A record change is a handful of named fields, so it is shown as one —
 * a description list, field as the term — with only the fields that changed.
 *
 * The before value carries a red wash and "Before:", the after a green wash
 * and "After:", hidden visually because the arrow already says it; the arrow
 * itself is hidden from a screen reader, which hears the words. A missing
 * side says "not set" rather than leaving a gap that reads as an empty string.
 */
export function FieldChanges({ title, changes, headingLevel = 4, messages, className, ...props }: FieldChangesProps) {
  const [t, f] = useMessages('fieldChanges', fieldChangesMessages, messages)
  const Heading = `h${headingLevel}` as const
  const headingId = React.useId()
  return (
    <section
      data-slot="field-changes"
      aria-labelledby={headingId}
      className={cn('bg-cloth-pale cut-frame nested:bg-cloth forced-colors:p-px', className)}
      {...props}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-keyline px-3 py-2.5">
        <Heading id={headingId} className="m-0 font-ui text-sm font-semibold text-ink">
          {title}
        </Heading>
        <span className="font-ui text-xs tabular text-ink-muted">
          {f.plural(t.fieldsChanged, changes.length)}
        </span>
      </header>
      <dl className="m-0 flex flex-col">
        {changes.map((change, i) => (
          <div
            key={change.field}
            className={cn(
              'grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 py-2.5 sm:grid-cols-[minmax(8rem,14rem)_minmax(0,1fr)]',
              i > 0 && 'border-t border-keyline',
            )}
          >
            <dt dir="ltr" className="literal self-center text-start text-xs font-medium text-ink-2 [overflow-wrap:anywhere]">
              {change.field}
            </dt>
            <dd className="m-0 flex flex-wrap items-center gap-2">
              <Value side="before" value={change.before} t={t} />
              <span aria-hidden className="font-ui text-sm text-ink-muted flip-rtl">
                →
              </span>
              <Value side="after" value={change.after} t={t} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Value({ side, value, t }: { side: 'before' | 'after'; value: React.ReactNode; t: FieldChangesMessages }) {
  const missing = value === undefined || value === null
  return (
    <span
      className={cn(
        'inline-flex min-w-0 px-1.5 py-0.5 literal text-xs [overflow-wrap:anywhere]',
        missing ? 'text-ink-muted' : side === 'before' ? 'bg-danger-soft text-ink' : 'bg-verde-soft text-ink',
        !missing && side === 'before' && 'line-through decoration-ink-muted',
      )}
    >
      <span className="sr-only">
        {side === 'before' ? t.before : t.after}{' '}
      </span>
      {missing ? <span className="font-ui">{t.notSet}</span> : <span dir="ltr">{value}</span>}
    </span>
  )
}
