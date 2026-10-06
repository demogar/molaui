import { Collapsible } from '@base-ui/react/collapsible'
import { Check, Plus, RotateCcw, ShieldAlert, Wrench, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { Button } from '../../button'
import { CodeBlock } from '../../code'
import { FailureReportedContext } from '../run-error/failure-reported'
import { RunStatus, type RunStatusValue } from '../run-status'

export interface ToolCallApproval {
  /** Why a person has to approve this — said in words, not implied by an icon. */
  reason: React.ReactNode
  onApprove: () => void
  onDeny: () => void
  approveLabel?: string
  denyLabel?: string
}

export interface ToolCallProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The tool's identifier, exactly as the model called it. */
  name: string
  /** What the call is for, in words — "Query rollout results". Optional; the name is always shown. */
  title?: string
  status: RunStatusValue
  startedAt?: number | Date
  endedAt?: number | Date
  durationMs?: number
  /** The arguments the model sent. Objects are shown as formatted JSON. */
  args?: unknown
  /** What came back. Objects as JSON; strings as text. */
  result?: unknown
  /** The error, verbatim. */
  error?: string
  onRetry?: () => void
  /** Present when `status` is `waiting`: the call is held for a person. */
  approval?: ToolCallApproval
  /** Start expanded. Waiting and failed calls are always expanded. */
  defaultOpen?: boolean
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
  defaultOpen = false,
  className,
  ...props
}: ToolCallProps) {
  const failed = status === 'failed' || status === 'timed_out'
  const waiting = status === 'waiting' && approval !== undefined
  const forcedOpen = failed || waiting
  const working = status === 'running' || status === 'streaming'
  const hasBody = args !== undefined || result !== undefined || failed || waiting
  // Always controlled: a live call goes from running to failed, and passing
  // `open` only once forced switched Base UI from uncontrolled to controlled.
  const [openState, setOpenState] = React.useState(defaultOpen)
  // Inside an AgentRun step whose RunError already raised the alarm, the
  // error is this call's record, not a second alert.
  const reported = React.useContext(FailureReportedContext)

  return (
    <div
      data-slot="tool-call"
      data-status={status}
      className={cn('relative bg-cloth-pale shadow-cut', waiting && 'band-oro cut-band [--cut-reveal:3px]', className)}
      {...props}
    >
      {working ? <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] band-oro relleno-working" /> : null}
      <Collapsible.Root open={forcedOpen || openState} onOpenChange={setOpenState}>
        <Collapsible.Trigger
          disabled={!hasBody || forcedOpen}
          className={cn(
            'group/trigger flex w-full min-h-(--control-h) items-center gap-2.5 px-3 py-2 text-start',
            'transition-colors duration-(--motion-cut) ease-cut enabled:hover:bg-ink-soft',
            'focus-visible:shadow-[var(--focus-ring-inset)] disabled:cursor-default',
          )}
        >
          <Plus
            aria-hidden
            className={cn(
              'size-3.5 shrink-0 text-ink-muted transition-transform duration-(--motion-base) ease-cut group-data-[panel-open]/trigger:rotate-45',
              (!hasBody || forcedOpen) && 'invisible',
            )}
          />
          <Wrench aria-hidden className="size-3.5 shrink-0 text-ink-muted" />
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="literal truncate text-sm font-medium text-ink">{name}</span>
            {title ? <span className="truncate font-ui text-sm text-ink-muted">{title}</span> : null}
          </span>
          <RunStatus
            status={status}
            startedAt={startedAt}
            endedAt={endedAt}
            durationMs={durationMs}
            className="shrink-0"
          />
        </Collapsible.Trigger>
        {hasBody ? (
          <Collapsible.Panel className="border-t border-keyline">
            <div className="flex flex-col gap-3 p-3">
              {waiting ? <ApprovalBlock approval={approval} /> : null}
              {failed && !reported ? <ErrorBlock status={status} error={error} onRetry={onRetry} /> : null}
              {args !== undefined ? <Payload label="arguments" value={args} /> : null}
              {result !== undefined ? <Payload label="result" value={result} /> : null}
              {failed && reported && error ? <Payload label="error" value={error} /> : null}
            </div>
          </Collapsible.Panel>
        ) : null}
      </Collapsible.Root>
    </div>
  )
}

function Payload({ label, value }: { label: string; value: unknown }) {
  const isText = typeof value === 'string'
  return (
    <CodeBlock
      label={label}
      language={isText ? 'text' : 'json'}
      code={isText ? value : JSON.stringify(value, null, 2)}
      maxHeight="16rem"
    />
  )
}

function ErrorBlock({
  status,
  error,
  onRetry,
}: {
  status: RunStatusValue
  error?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-x-4 gap-y-3 bg-rojo-soft px-3.5 py-3 shadow-[inset_3px_0_0_var(--rojo)] rtl:shadow-[inset_-3px_0_0_var(--rojo)]">
      <div className="min-w-0 flex-1">
        <p className="m-0 font-ui text-sm font-semibold text-ink">
          {status === 'timed_out' ? 'The tool did not answer in time.' : 'The tool returned an error.'}
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
          Retry call
        </Button>
      ) : null}
    </div>
  )
}

function ApprovalBlock({ approval }: { approval: ToolCallApproval }) {
  return (
    <div className="flex flex-col gap-3 bg-oro-soft px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
        <div className="min-w-0">
          <p className="m-0 font-ui text-sm font-semibold text-ink">This call needs your approval.</p>
          <div className="m-0 mt-1 font-ui text-sm text-ink-on-tint">{approval.reason}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ps-6.5">
        {/* Same variant as Deny, as in ChangeReview. Approve was the ink
            primary until the two were compared side by side: the doc said
            "equal weight" and the pixels said "press this one". */}
        <Button size="sm" variant="secondary" icon={<Check />} onClick={approval.onApprove}>
          {approval.approveLabel ?? 'Approve'}
        </Button>
        <Button size="sm" variant="secondary" icon={<X />} onClick={approval.onDeny}>
          {approval.denyLabel ?? 'Deny'}
        </Button>
      </div>
    </div>
  )
}

export interface ToolCallGroupProps extends React.ComponentProps<'div'> {
  /** Defaults to "N tools in parallel". */
  label?: string
  count: number
}

/**
 * Calls the model made at the same time. Drawn as a bracket on the left —
 * one ink rule spanning the group — so "these ran together" is a shape,
 * not a sentence the operator has to find.
 */
export function ToolCallGroup({ label, count, className, children, ...props }: ToolCallGroupProps) {
  return (
    <div role="group" aria-label={label ?? `${count} tools in parallel`} className={cn('flex flex-col gap-2', className)} {...props}>
      <p className="m-0 rotulo text-ink-muted">{label ?? `${count} tools in parallel`}</p>
      <div className="flex flex-col gap-2 border-s-[3px] border-ink ps-3">{children}</div>
    </div>
  )
}

