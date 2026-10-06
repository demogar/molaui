import { Collapsible } from '@base-ui/react/collapsible'
import { Check, Copy, Plus, RotateCcw, Square } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'
import { Button, IconButton } from '../../button'
import {
  RUN_STATUS_LABEL,
  RunStatus,
  RunStatusGlyph,
  formatDuration,
  isActiveStatus,
  isRetryableStatus,
  useElapsed,
  type RunStatusValue,
} from '../run-status'
import { RunError, type RunErrorProps } from '../run-error'
import { TokenUsage, type TokenUsageProps } from '../token-usage'

export type AgentStepKind = 'reasoning' | 'tool' | 'message' | 'handoff' | 'approval'

const KIND_LABEL: Record<AgentStepKind, string> = {
  reasoning: 'Reasoning',
  tool: 'Tool call',
  message: 'Message',
  handoff: 'Handoff',
  approval: 'Approval',
}

export interface AgentStep {
  id: string
  kind: AgentStepKind
  /** What happened, in words. A tool step's literal name belongs in `detail`. */
  title: React.ReactNode
  status: RunStatusValue
  startedAt?: number | Date
  endedAt?: number | Date
  durationMs?: number
  /** Revealed when the step is opened — a ToolCall, a Reasoning block, a message. */
  detail?: React.ReactNode
  defaultOpen?: boolean
}

/** Why the run stopped, and where. AgentRun works out the step's number and title from `stepId`. */
export interface AgentRunFailure
  extends Pick<RunErrorProps, 'kind' | 'tool' | 'error' | 'message' | 'at' | 'retryAt' | 'autoRetry'> {
  /** The step the run stopped at. */
  stepId?: string
}

export interface AgentRunProps extends Omit<React.ComponentProps<'section'>, 'children'> {
  /** The agent's name — "Cayuco research agent". */
  name: string
  runId: string
  status: RunStatusValue
  startedAt?: number | Date
  endedAt?: number | Date
  /** The model identifier, set as a literal. */
  model?: string
  usage?: Pick<TokenUsageProps, 'input' | 'output' | 'cached' | 'costUsd' | 'contextWindow'>
  steps: readonly AgentStep[]
  onCancel?: () => void
  onRetry?: () => void
  /**
   * Shown while the run is failed, timed out or cancelled: what stopped it,
   * in words and verbatim, with the ways back. It takes over the header's
   * *Retry run*, so the retry sits next to the reason for it.
   */
  failure?: AgentRunFailure
  /** Re-run from the failed step, keeping the work before it. Offered when `failure.stepId` is set. */
  onRetryFromStep?: (stepId: string) => void
  /** Shown under the timeline once the run has finished. */
  summary?: React.ReactNode
  headingLevel?: 2 | 3
}

/**
 * A long-running agent run, as a timeline.
 *
 * The question an operator brings to a run is never "what is the progress
 * percentage" — there isn't one. It is: is it still working, what is it doing
 * right now, how long has that taken, and does it need me. The layout answers
 * those in that order.
 *
 *   - The header carries the run's status with a clock that keeps counting,
 *     and Cancel while it is open; Retry once it has failed or been stopped.
 *   - The steps hang off one vertical spine, as an ordered list — the order
 *     IS the content, and a screen reader says "step 3 of 6". Each node is
 *     the step's status glyph. The spine is solid ink through finished work
 *     and a pale keyline through work not yet started, so how far the run has
 *     got is a shape you see before you read anything.
 *   - The active step carries the working relleno under its title and a live
 *     clock at the right edge, where every finished step shows its fixed
 *     duration in tabular figures, so durations compare down the column.
 *   - A step waiting for approval or failed opens itself; everything else is
 *     one line until asked.
 *   - When the run stops, `failure` puts the reason between the header and
 *     the steps — the first thing read, before the timeline that explains
 *     it — naming the step by number so it can be found on the spine. The
 *     steps before it keep their output; nothing is cleared on failure.
 *
 * Status changes of the run itself are announced once each through a polite
 * status region. Steps are not announced individually — a run with forty
 * steps would talk over the operator for a minute.
 */
export function AgentRun({
  name,
  runId,
  status,
  startedAt,
  endedAt,
  model,
  usage,
  steps,
  onCancel,
  onRetry,
  failure,
  onRetryFromStep,
  summary,
  headingLevel = 3,
  className,
  ...props
}: AgentRunProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const active = isActiveStatus(status)
  const headingId = React.useId()
  const shown = failure !== undefined && isRetryableStatus(status) ? failure : undefined

  // Retrying removes the panel the button was in. Focus would fall to the
  // body and a keyboard user would start again from the top of the page, so
  // it goes to the run's heading: the status under it is what changes next.
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const refocus = React.useRef(false)
  const retrying = (action: () => void) => () => {
    refocus.current = true
    action()
  }
  React.useEffect(() => {
    if (shown || !refocus.current) return
    refocus.current = false
    headingRef.current?.focus()
  }, [shown])
  const failedIndex = failure?.stepId === undefined ? -1 : steps.findIndex((s) => s.id === failure.stepId)
  const failedStep = steps[failedIndex]

  const [prevStatus, setPrevStatus] = React.useState(status)
  const [announcement, setAnnouncement] = React.useState('')
  if (status !== prevStatus) {
    setPrevStatus(status)
    // A failure panel is an alert and says it in a full sentence; saying
    // "Run failed." as well would be the same news twice.
    const alerted = shown !== undefined && shown.kind !== 'cancelled' && status !== 'cancelled'
    setAnnouncement(alerted ? '' : `Run ${RUN_STATUS_LABEL[status].toLowerCase()}.`)
  }

  return (
    <section
      data-slot="agent-run"
      data-status={status}
      aria-labelledby={headingId}
      className={cn('flex flex-col bg-cloth-pale shadow-cut', className)}
      {...props}
    >
      <header className="flex flex-col gap-3 border-b border-keyline p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Heading ref={headingRef} id={headingId} tabIndex={-1} className="m-0 outline-none font-display text-lg leading-snug font-bold tracking-display wdth-display">
              {name}
            </Heading>
            <RunStatus status={status} startedAt={startedAt} endedAt={endedAt} />
          </div>
          <div className="flex shrink-0 gap-2">
            {active && onCancel ? (
              <Button size="sm" variant="secondary" icon={<Square className="fill-current" />} onClick={onCancel}>
                Cancel run
              </Button>
            ) : null}
            {isRetryableStatus(status) && onRetry && !shown ? (
              <Button size="sm" icon={<RotateCcw />} onClick={onRetry}>
                Retry run
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <RunId id={runId} />
          {model ? <span className="literal text-xs text-ink-muted">{model}</span> : null}
          {usage ? <TokenUsage variant="inline" {...usage} /> : null}
        </div>
      </header>

      {shown ? (
        <RunError
          className="mx-4 mt-4"
          kind={shown.kind ?? (status === 'timed_out' ? 'timed_out' : status === 'cancelled' ? 'cancelled' : 'failed')}
          step={typeof failedStep?.title === 'string' ? failedStep.title : undefined}
          stepNumber={failedStep ? failedIndex + 1 : undefined}
          stepCount={failedStep ? steps.length : undefined}
          tool={shown.tool}
          error={shown.error}
          message={shown.message}
          runId={runId}
          at={shown.at}
          retryAt={shown.retryAt}
          autoRetry={shown.autoRetry}
          onRetry={onRetry ? retrying(onRetry) : undefined}
          onRetryFromStep={failedStep && onRetryFromStep ? retrying(() => onRetryFromStep(failedStep.id)) : undefined}
        />
      ) : null}

      <ol aria-label={`Steps of ${name}`} className="m-0 list-none p-4 pb-2">
        {steps.map((step, i) => (
          <StepRow key={step.id} step={step} last={i === steps.length - 1} nextStarted={steps[i + 1]?.status !== 'queued'} />
        ))}
      </ol>

      {summary && !active ? <footer className="border-t border-keyline p-4">{summary}</footer> : null}

      <span role="status" className="sr-only">
        {announcement}
      </span>
    </section>
  )
}

function StepRow({ step, last, nextStarted }: { step: AgentStep; last: boolean; nextStarted: boolean }) {
  const active = isActiveStatus(step.status)
  const working = step.status === 'running' || step.status === 'streaming'
  const forcedOpen = step.status === 'waiting' || step.status === 'failed' || step.status === 'timed_out'
  const hasDetail = step.detail !== undefined
  const elapsed = useElapsed(step.startedAt, active ? step.endedAt : (step.endedAt ?? step.startedAt))
  const ms = step.durationMs ?? (step.startedAt !== undefined && (active || step.endedAt !== undefined) ? elapsed : undefined)
  const done = step.status === 'succeeded'
  // Always controlled: a live step goes from running (opens on demand) to
  // failed (forced open), and handing Base UI `open` only in the second state
  // switched it from uncontrolled to controlled mid-life, which it rejects.
  const [openState, setOpenState] = React.useState(step.defaultOpen ?? false)

  const headline = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="rotulo text-ink-muted">{KIND_LABEL[step.kind]}</span>
        <span className={cn('font-ui text-sm leading-snug', step.status === 'queued' ? 'text-ink-muted' : 'text-ink')}>
          {step.title}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 pt-[1px]">
        <span className={cn('rotulo', active ? 'text-ink' : 'text-ink-muted')}>
          {step.status === 'succeeded' ? <span className="sr-only">{RUN_STATUS_LABEL[step.status]}</span> : RUN_STATUS_LABEL[step.status]}
        </span>
        {ms !== undefined ? <span className="font-ui text-xs tabular text-ink-2">{formatDuration(ms)}</span> : null}
      </span>
    </>
  )

  return (
    <li data-status={step.status} className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3">
      <span aria-hidden className="flex flex-col items-center">
        <RunStatusGlyph status={step.status} className="mt-[3px] size-[11px] text-[11px]" />
        {!last ? <span className={cn('my-1 w-[1.5px] flex-1', done && nextStarted ? 'bg-ink' : 'bg-keyline')} /> : null}
      </span>
      <div className={cn('min-w-0', !last && 'pb-4')}>
        {hasDetail ? (
          <Collapsible.Root open={forcedOpen || openState} onOpenChange={setOpenState}>
            <Collapsible.Trigger
              disabled={forcedOpen}
              className={cn(
                'group/step -mx-2 -my-1 flex w-[calc(100%+1rem)] items-start gap-2 px-2 py-1 text-start',
                'transition-colors duration-(--motion-cut) ease-cut enabled:hover:bg-ink-soft disabled:cursor-default',
              )}
            >
              <Plus
                aria-hidden
                className={cn(
                  'mt-[15px] size-3.5 shrink-0 text-ink-muted transition-transform duration-(--motion-base) ease-cut group-data-[panel-open]/step:rotate-45',
                  forcedOpen && 'invisible',
                )}
              />
              {headline}
            </Collapsible.Trigger>
            {working ? <WorkingStrip /> : null}
            <Collapsible.Panel className="pt-3">{step.detail}</Collapsible.Panel>
          </Collapsible.Root>
        ) : (
          <>
            <div className="flex items-start gap-2 ps-5.5">{headline}</div>
            {working ? <WorkingStrip /> : null}
          </>
        )}
      </div>
    </li>
  )
}

function WorkingStrip() {
  return <span aria-hidden className="mt-2 block h-[3px] w-full max-w-48 band-oro relleno-working" />
}

/** The run id as a literal, with a copy action — run ids are pasted into tickets more than they are read. */
function RunId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <span className="inline-flex items-center gap-1">
      <span className="literal text-xs text-ink-2">{id}</span>
      <IconButton
        size="sm"
        variant="ghost"
        label={copied ? 'Run id copied' : 'Copy run id'}
        className="size-6 w-6"
        onClick={() => {
          void navigator.clipboard?.writeText(id).then(() => setCopied(true))
        }}
      >
        {copied ? <Check /> : <Copy />}
      </IconButton>
      <span role="status" className="sr-only">
        {copied ? 'Run id copied' : ''}
      </span>
    </span>
  )
}
