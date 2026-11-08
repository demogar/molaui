'use client'

import { Collapsible } from '@base-ui/react/collapsible'
import { Check, CircleAlert, Info, PencilLine, Plus, RotateCcw, ShieldAlert, Wrench, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessageFormat, type MessagesOverride, formatMessage, useMessages } from '../../../lib/messages'
import { useControllable } from '../../../lib/use-controllable'
import { Button } from '../../button'
import { CodeBlock } from '../../code'
import { type FieldChange, FieldChangeList } from '../change-review/change-review'
import { type FieldChangesMessages, fieldChangesMessages } from '../change-review/messages'
import { FailureReportedContext } from '../run-error/failure-reported'
import { RunStatus, RunStatusGlyph, type RunStatusValue } from '../run-status'

import { type ToolCallGroupMessages, type ToolCallMessages, toolCallGroupMessages, toolCallMessages } from './messages'

/** The arguments of a tool call, as a person edits them: one value per argument name. */
export type ToolCallArgs = Record<string, unknown>

export interface ToolCallApprovalEdit {
  /**
   * The fields for the arguments a person may change, drawn with the app's own
   * `Field`s. `draft` starts as a copy of `args`; call `setDraft` with the whole
   * next value. Leave out the arguments that must not change.
   */
  render: (draft: ToolCallArgs, setDraft: (next: ToolCallArgs) => void) => React.ReactNode
  /**
   * Checks the edited arguments against the tool's schema. Return the reason, in
   * words, when they are invalid; `null` or nothing when they are valid. Approve
   * with edits is not offered until it returns nothing.
   */
  validate?: (draft: ToolCallArgs) => string | null | undefined
  /** Called with the edited arguments when the person approves them. */
  onApprove: (edited: ToolCallArgs) => void
  /** The button that opens the fields, unless set: "Edit and approve". */
  label?: string
}

export interface ToolCallApproval {
  /** Why a person has to approve this — said in words, not implied by an icon. */
  reason: React.ReactNode
  onApprove: () => void
  onDeny: () => void
  approveLabel?: string
  denyLabel?: string
  /**
   * Lets the person change the arguments before approving. The result is its own
   * decision, `approved_with_edits`, not an approval: what runs is not what the
   * agent proposed. Offered only when `args` is an object.
   */
  edit?: ToolCallApprovalEdit
}

/**
 * What the person decided about a held call. Separate from `status`, which is
 * about execution: an approved call can still fail.
 */
export type ToolCallDecisionStatus = 'approved' | 'approved_with_edits' | 'denied'

export interface ToolCallDecision {
  status: ToolCallDecisionStatus
  /** Who decided — "M. Herrera". Shown with the outcome. */
  by?: string
  /**
   * With `approved_with_edits`: the arguments that ran. `args` keeps what the
   * agent proposed, so the record holds both.
   */
  editedArgs?: ToolCallArgs
}

export interface ToolCallProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The tool's identifier, exactly as the model called it. */
  name: string
  /** What the call is for, in words — "Query rollout results". Optional; the name is always shown. */
  title?: string
  /**
   * The call's state. `waiting` and `failed` keep the details open, because the
   * decision or the error is the content.
   */
  status: RunStatusValue
  /**
   * When the call started. With it, the header shows a clock that counts while the
   * call is active.
   */
  startedAt?: number | Date
  /** When the call ended. Freezes the clock; omit while the call is open. */
  endedAt?: number | Date
  /** A known duration, for a finished call that has no timestamps. */
  durationMs?: number
  /** The arguments the model sent. Objects are shown as formatted JSON. */
  args?: unknown
  /** What came back. Objects as JSON; strings as text. */
  result?: unknown
  /** The error, verbatim. */
  error?: string
  /**
   * Calls the tool again. Shows Retry beside the error once the call has failed;
   * omit when the run, not the call, owns retrying.
   */
  onRetry?: () => void
  /** Present when `status` is `waiting`: the call is held for a person. */
  approval?: ToolCallApproval
  /**
   * What the person decided, once they have. Shown under the header as the
   * record — glyph, word and who — and, for `approved_with_edits`, each argument
   * that changed. Pass it back from your `approval` handlers.
   */
  decision?: ToolCallDecision | null
  /** Whether the details are expanded, when the page owns that. Waiting and failed calls are always expanded. */
  open?: boolean
  /** Start expanded. Waiting and failed calls are always expanded. */
  defaultOpen?: boolean
  /** Called when the reader opens or closes the details. */
  onOpenChange?: (open: boolean) => void
  /** Words for translation: the payload labels, the error and approval sentences, their buttons and the decisions. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<ToolCallMessages>
}

/**
 * One tool invocation: what the model asked a system to do, with what, and
 * what came back.
 *
 * Everything the machine did is a literal — the tool name, the arguments, the
 * result — because an operator does not read these, they inspect them, and
 * they paste them into tickets. Only the optional `title` is prose.
 *
 * ── collapsed by default, except when it needs you ──
 * A run can make forty tool calls; forty open JSON payloads is a wall. So a
 * call shows one line — name, status, duration — and opens on demand. Two
 * states override that, because hiding them would hide the only thing that
 * matters on the screen: a failed call (the error and Retry are the content)
 * and a call waiting for approval (the decision is the content).
 *
 * ── human in the loop ──
 * A call that needs approval states WHY in words, and offers Approve and Deny
 * as buttons of the same size and variant, neither styled as the lesser
 * option — the same rule `ChangeReview` follows for its three decisions. A
 * consent control that nudges is not consent; for a tool that writes to
 * production it is a bug.
 *
 * ── approved with edits is its own decision ──
 * A person often approves a call after changing an argument: half the
 * refund, the rollout at 10%. Recording that as "approved" claims the agent's
 * call ran as proposed, and the audit trail loses what the person changed;
 * a flag beside "approved" is the first thing a report drops. So it is a
 * third decision with its own glyph, word and ink, and the record keeps the
 * proposed arguments (`args`) beside the ones that ran (`editedArgs`), each
 * changed argument shown before → after as `FieldChanges` shows a field.
 * "Take over" overstates it the other way: the agent's plan stands, one
 * argument moved. The fields are the app's, because only the app knows which
 * arguments a person may change and in what control; a JSON editor would
 * ask an operator to type braces. Approve with edits is not offered while
 * nothing has changed or the tool's schema rejects the draft, and the reason
 * is said in words beside it.
 *
 * The decision is separate from `status`, as in `ChangeReview`: one is about
 * the person, the other about execution.
 *
 * ── working ──
 * A running call carries a strip of working relleno along its top edge — the
 * system's "size unknown" texture — and a ticking clock. No spinner, no
 * percentage.
 */
export function ToolCall({
  name,
  title,
  status,
  startedAt,
  endedAt,
  durationMs,
  args,
  result,
  error,
  onRetry,
  approval,
  decision,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  messages,
  className,
  ...props
}: ToolCallProps) {
  const [t, f] = useMessages('toolCall', toolCallMessages, messages)
  const [changeWords] = useMessages('fieldChanges', fieldChangesMessages)
  const failed = status === 'failed' || status === 'timed_out'
  const waiting = status === 'waiting' && approval !== undefined
  const forcedOpen = failed || waiting
  const working = status === 'running' || status === 'streaming'
  const hasBody = args !== undefined || result !== undefined || failed || waiting
  // Always controlled: a live call goes from running to failed, and passing
  // `open` only once forced switched Base UI from uncontrolled to controlled.
  const [openState, setOpenState] = useControllable({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange })
  // Inside an AgentRun step whose RunError already raised the alarm, the
  // error is this call's record, not a second alert.
  const reported = React.useContext(FailureReportedContext)

  // Focus follows a decision made here, as in ChangeReview: the pressed button
  // is gone, so focus goes to the record of what was decided, or, if the page
  // moves the call on without a decision, to the header. A call that loads
  // already decided does not take focus.
  const headerRef = React.useRef<HTMLButtonElement>(null)
  const outcomeRef = React.useRef<HTMLDivElement>(null)
  const decidedHere = React.useRef(false)
  React.useEffect(() => {
    if (!decidedHere.current || waiting) return
    decidedHere.current = false
    ;(decision ? outcomeRef.current : headerRef.current)?.focus()
  }, [decision, waiting])
  const edited = decision?.status === 'approved_with_edits' && decision.editedArgs !== undefined

  return (
    <div
      data-slot="tool-call"
      data-status={status}
      data-decision={decision?.status}
      className={cn('relative bg-cloth-pale cut-frame nested:bg-cloth', waiting && 'band-accent cut-band [--cut-reveal:3px]', className)}
      {...props}
    >
      {working ? <span aria-hidden data-part="progress" className="absolute inset-x-0 top-0 h-(--bar-w) band-accent relleno-working" /> : null}
      {/* A forced-open call ignores the toggle, so it does not come back
          collapsed (or expanded) by a click made while it could not close. */}
      <Collapsible.Root open={forcedOpen || openState} onOpenChange={(next) => !forcedOpen && setOpenState(next)}>
        {/* Forced open, the header is `aria-disabled`, not `disabled`: a
            disabled button leaves the tab order, so on a failed call or one
            waiting for approval, Tab went straight to Retry or Approve and the
            call's name and status were never a stop. Now it is one, announced
            as expanded and unavailable — open, and staying open. */}
        <Collapsible.Trigger
          ref={headerRef}
          data-part="header"
          disabled={!hasBody}
          aria-disabled={forcedOpen || undefined}
          className={cn(
            'group/trigger flex w-full min-h-(--control-h) items-center gap-2.5 px-3 py-2 text-start',
            'transition-colors enabled:not-aria-disabled:hover:bg-ink-soft',
            'focus-visible:focus-ring-inset disabled:cursor-default aria-disabled:cursor-default',
          )}
        >
          <Plus
            aria-hidden
            className={cn(
              'size-(--icon-sm) shrink-0 text-ink-muted transition-transform duration-(--motion-base) group-data-[panel-open]/trigger:rotate-45',
              (!hasBody || forcedOpen) && 'invisible',
            )}
          />
          <Wrench aria-hidden className="size-(--icon-sm) shrink-0 text-ink-muted" />
          {/* The status wraps under the name before the name gives way. Side by
              side, a 390px phone truncated the tool name to "billing.i…" while
              "Needs approval" kept its full width, and the name is the literal
              the person is approving. The name keeps at least 10rem. */}
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="flex min-w-[min(100%,10rem)] flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span data-part="name" className="literal truncate text-sm font-medium text-ink">{name}</span>
              {title ? <span data-part="title" className="truncate font-ui text-sm text-ink-muted">{title}</span> : null}
            </span>
            <RunStatus
              data-part="status"
              status={status}
              startedAt={startedAt}
              endedAt={endedAt}
              durationMs={durationMs}
              className="ms-auto shrink-0"
            />
          </span>
        </Collapsible.Trigger>
        {/* Outside the panel: the decision is the record, and a collapsed
            call must still say who approved what. */}
        {decision && !waiting ? (
          <Outcome ref={outcomeRef} decision={decision} args={args} t={t} f={f} changeWords={changeWords} />
        ) : null}
        {hasBody ? (
          <Collapsible.Panel data-part="body" className="border-t border-keyline">
            <div className="flex flex-col gap-3 p-3">
              {waiting ? (
                <ApprovalBlock
                  approval={approval}
                  args={args}
                  onDecide={() => (decidedHere.current = true)}
                  t={t}
                  changeWords={changeWords}
                />
              ) : null}
              {failed && !reported ? <ErrorBlock status={status} error={error} onRetry={onRetry} t={t} /> : null}
              {args !== undefined ? <Payload label={edited ? t.proposedArguments : t.arguments} value={args} /> : null}
              {edited ? <Payload label={t.editedArguments} value={decision?.editedArgs} /> : null}
              {result !== undefined ? <Payload label={t.result} value={result} /> : null}
              {failed && reported && error ? <Payload label={t.error} value={error} wrap /> : null}
            </div>
          </Collapsible.Panel>
        ) : null}
      </Collapsible.Root>
    </div>
  )
}

function Payload({ label, value, wrap }: { label: string; value: unknown; wrap?: boolean }) {
  const isText = typeof value === 'string'
  return (
    <CodeBlock
      label={label}
      language={isText ? 'text' : 'json'}
      code={isText ? value : JSON.stringify(value, null, 2)}
      maxHeight="16rem"
      wrap={wrap}
    />
  )
}

function ErrorBlock({
  status,
  error,
  onRetry,
  t,
}: {
  status: RunStatusValue
  error?: string
  onRetry?: () => void
  t: ToolCallMessages
}) {
  return (
    <div role="alert" data-part="error" className="flex flex-wrap items-start gap-x-4 gap-y-3 bg-danger-soft px-3.5 py-3 bar-start-danger">
      <div className="min-w-0 flex-1">
        <p className="m-0 font-ui text-sm font-semibold text-ink">
          {status === 'timed_out' ? t.timedOut : t.failed}
        </p>
        {/* Verbatim and left-to-right: a right-to-left paragraph would reorder
            the punctuation of a string someone is going to paste into a search. */}
        {error ? (
          <p className="m-0 mt-1 literal text-xs text-ink-on-tint [overflow-wrap:anywhere]">
            <span dir="ltr">{error}</span>
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={onRetry}>
          {t.retry}
        </Button>
      ) : null}
    </div>
  )
}

function ApprovalBlock({
  approval,
  args,
  onDecide,
  t,
  changeWords,
}: {
  approval: ToolCallApproval
  args: unknown
  onDecide: () => void
  t: ToolCallMessages
  changeWords: FieldChangesMessages
}) {
  const [draft, setDraft] = React.useState<ToolCallArgs | null>(null)
  const editButtonRef = React.useRef<HTMLButtonElement>(null)
  const fieldsRef = React.useRef<HTMLDivElement>(null)
  const reasonId = React.useId()
  const edit = isArgs(args) ? approval.edit : undefined
  const editing = draft !== null

  // Opening the fields moves focus into them; cancelling returns it to the
  // button that opened them, which is back in the same place.
  const opened = React.useRef<'opened' | 'cancelled' | null>(null)
  React.useEffect(() => {
    if (opened.current === 'opened') fieldsRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
    if (opened.current === 'cancelled') editButtonRef.current?.focus()
    opened.current = null
  }, [editing])

  const decide = (run: () => void) => () => {
    onDecide()
    run()
  }

  if (edit && draft && isArgs(args)) {
    const changes = argumentChanges(args, draft, t)
    const invalid = changes.length > 0 ? (edit.validate?.(draft) ?? null) : null
    const blocked = changes.length === 0 || invalid !== null
    return (
      <div data-part="approval" data-editing="" className="flex flex-col gap-3 bg-oro-soft px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <PencilLine aria-hidden className="mt-0.5 size-(--icon) shrink-0 text-ink" />
          <div className="min-w-0">
            <p className="m-0 font-ui text-sm font-semibold text-ink">{t.editing}</p>
            <div className="m-0 mt-1 font-ui text-sm text-ink-on-tint">{approval.reason}</div>
          </div>
        </div>
        <div ref={fieldsRef} className="flex flex-col gap-3 ps-6.5">
          {edit.render(draft, setDraft)}
        </div>
        {changes.length > 0 ? (
          <FieldChangeList changes={changes} t={changeWords} className="ms-6.5 bg-cloth-pale cut-frame" />
        ) : null}
        {/* Always in the tree, so the reason Approve with edits is unavailable
            is announced when it changes, not only when focus finds it. */}
        <div id={reasonId} aria-live="polite" className="ps-6.5">
          {invalid !== null ? (
            <p className="m-0 flex items-start gap-2 font-ui text-sm text-ink">
              <CircleAlert aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0 text-ink-danger" />
              <span>
                <span className="font-semibold">{t.editInvalid}</span> {invalid}
              </span>
            </p>
          ) : changes.length === 0 ? (
            <p className="m-0 flex items-start gap-2 font-ui text-sm text-ink-on-tint">
              <Info aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0 text-ink" />
              <span>{t.editUnchanged}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 ps-6.5">
          <Button
            size="sm"
            variant="secondary"
            icon={<Check />}
            disabled={blocked}
            aria-describedby={blocked ? reasonId : undefined}
            onClick={decide(() => edit.onApprove(draft))}
          >
            {t.approveWithEdits}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<X />}
            onClick={() => {
              opened.current = 'cancelled'
              setDraft(null)
            }}
          >
            {t.cancelEdits}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-part="approval" className="flex flex-col gap-3 bg-oro-soft px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <ShieldAlert aria-hidden className="mt-0.5 size-(--icon) shrink-0 text-ink" />
        <div className="min-w-0">
          <p className="m-0 font-ui text-sm font-semibold text-ink">{t.needsApproval}</p>
          <div className="m-0 mt-1 font-ui text-sm text-ink-on-tint">{approval.reason}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ps-6.5">
        {/* Same variant as Deny, as in ChangeReview. Approve was the ink
            primary until the two were compared side by side: the doc said
            "equal weight" and the pixels said "press this one". Edit and
            approve takes the same weight: changing the call is not the
            lesser option either. */}
        <Button size="sm" variant="secondary" icon={<Check />} onClick={decide(approval.onApprove)}>
          {approval.approveLabel ?? t.approve}
        </Button>
        {edit && isArgs(args) ? (
          <Button
            ref={editButtonRef}
            size="sm"
            variant="secondary"
            icon={<PencilLine />}
            onClick={() => {
              opened.current = 'opened'
              setDraft(structuredClone(args))
            }}
          >
            {edit.label ?? t.editAndApprove}
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" icon={<X />} onClick={decide(approval.onDeny)}>
          {approval.denyLabel ?? t.deny}
        </Button>
      </div>
    </div>
  )
}

const DECISION_INK: Record<ToolCallDecisionStatus, string> = {
  approved: 'text-ink-success',
  approved_with_edits: 'text-ink-info',
  denied: 'text-ink-danger',
}

function Outcome({
  ref,
  decision,
  args,
  t,
  f,
  changeWords,
}: {
  ref: React.Ref<HTMLDivElement>
  decision: ToolCallDecision
  args: unknown
  t: ToolCallMessages
  f: MessageFormat
  changeWords: FieldChangesMessages
}) {
  const word = t.decisions[decision.status]
  const changes =
    decision.status === 'approved_with_edits' && decision.editedArgs !== undefined
      ? argumentChanges(args, decision.editedArgs, t)
      : []
  const headline = decision.by ? `${word} ${formatMessage(t.decidedBy, { name: decision.by })}` : word
  // Said as one sentence when focus lands here: "Approved with edits by
  // M. Herrera: amount_usd changed from 240 to 120."
  const sentence =
    changes.length > 0
      ? formatMessage(t.decidedWithChanges, {
          decision: headline,
          changes: new Intl.ListFormat(f.locale ?? 'en-US').format(changes.map((change) => changeSentence(change, t))),
        })
      : headline
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-label={sentence}
      data-part="decision"
      className="flex flex-col gap-2 border-t border-keyline px-3 py-2.5 outline-none focus-visible:focus-ring-inset"
    >
      <p className="m-0 flex items-start gap-2.5 font-ui text-sm font-semibold">
        {decision.status === 'approved_with_edits' ? (
          <PencilLine aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0 text-ink-info" />
        ) : (
          <RunStatusGlyph status={decision.status === 'approved' ? 'succeeded' : 'failed'} className="mt-1 size-[13px]" />
        )}
        <span>
          <span className={DECISION_INK[decision.status]}>{word}</span>
          {decision.by ? <span className="font-normal text-ink-2"> {formatMessage(t.decidedBy, { name: decision.by })}</span> : null}
        </span>
      </p>
      {changes.length > 0 ? (
        <FieldChangeList changes={changes} t={changeWords} className="bg-cloth cut-frame" />
      ) : null}
    </div>
  )
}

function isArgs(value: unknown): value is ToolCallArgs {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Strings keep their quotes, so "120" and 120 do not read as the same value.
const literal = (value: unknown) => (value === undefined ? undefined : JSON.stringify(value))

/**
 * The arguments that differ, each before → after, in the order the agent
 * sent them and then any the person added. Compared as JSON, so a nested
 * object that changed anywhere is one row. Arguments that are not an object
 * are compared whole.
 */
function argumentChanges(before: unknown, after: unknown, t: ToolCallMessages): FieldChange[] {
  if (!isArgs(before) || !isArgs(after)) {
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ field: t.arguments, before: literal(before), after: literal(after) }]
  }
  const keys = [...Object.keys(before), ...Object.keys(after).filter((key) => !(key in before))]
  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ field: key, before: literal(before[key]), after: literal(after[key]) }))
}

function changeSentence(change: FieldChange, t: ToolCallMessages): string {
  const values = { field: change.field, before: String(change.before ?? ''), after: String(change.after ?? '') }
  if (change.before === undefined) return formatMessage(t.argumentAdded, values)
  if (change.after === undefined) return formatMessage(t.argumentRemoved, values)
  return formatMessage(t.argumentChanged, values)
}

export interface ToolCallGroupProps extends React.ComponentProps<'div'> {
  /** Defaults to "N tools in parallel". */
  label?: string
  /**
   * How many calls ran together. Used for the default label, "N tools in
   * parallel".
   */
  count: number
  /** Words for translation: the default label. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<ToolCallGroupMessages>
}

/**
 * Calls the model made at the same time. Drawn as a bracket on the left —
 * one ink rule spanning the group — so "these ran together" is a shape,
 * not a sentence the operator has to find.
 */
export function ToolCallGroup({ label, count, messages, className, children, ...props }: ToolCallGroupProps) {
  const [t, f] = useMessages('toolCallGroup', toolCallGroupMessages, messages)
  const name = label ?? f.plural(t.label, count)
  return (
    <div
      data-slot="tool-call-group"
      role="group"
      aria-label={name}
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      <p className="m-0 rotulo text-ink-muted">{name}</p>
      <div className="flex flex-col gap-2 border-s-(length:--bar-w) border-ink ps-3">{children}</div>
    </div>
  )
}

