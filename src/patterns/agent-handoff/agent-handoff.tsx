import { Hand, Send, Users } from 'lucide-react'
import * as React from 'react'
import { flushSync } from 'react-dom'

import { AgentRun, type AgentStep } from '../../components/ai/agent-run'
import { Confidence } from '../../components/ai/confidence'
import { Message } from '../../components/ai/message'
import { RunStatus, type RunStatusValue } from '../../components/ai/run-status'
import { ToolCall } from '../../components/ai/tool-call'
import { PageHeader } from '../../components/app-shell/page-header'
import { Badge } from '../../components/badge'
import { Breadcrumb } from '../../components/breadcrumb'
import { Button } from '../../components/button'
import { Callout } from '../../components/callout'
import { EmptyState } from '../../components/empty-state'
import { Field, Textarea } from '../../components/field'
import { Skeleton, SkeletonGroup, SkeletonText } from '../../components/skeleton'
import { HANDOFF, type Handoff, usd } from './_data'

/**
 * An agent hands a task to a person: it has done the work it may do, reached
 * something it may not, and stopped. The person approves what it proposes,
 * or takes the ticket over and finishes it themselves.
 *
 * ── the decision first, the evidence beside it ──
 * The screen leads with what the agent needs and why, in the agent's own
 * words (Alegreya, because a model wrote them), then the exact action it
 * wants to take as a tool call (Martian Mono, because it is what will run),
 * with Approve and Deny of equal weight. The run that led here sits beside
 * it as a timeline, so the person can check the work without leaving the
 * decision. Confidence is stated as a level and a basis a person can check,
 * never a percentage.
 *
 * ── two ways out, both always visible ──
 * Approve lets the agent finish: the refund runs, then the reply is sent.
 * Take over stops the agent and hands the person the draft reply to edit and
 * send as themselves. Deny is a take-over too: the agent's plan was refused,
 * so it has nothing left to do, and the ticket is the person's. Nothing is
 * sent to the customer until one of these happens.
 *
 * ── when the person may not approve ──
 * A refund this size needs a billing lead. A support operator still sees the
 * proposal, but without Approve: an approval they are not allowed to give
 * would fail after they had decided. Instead it says who can approve, offers
 * to reassign, and Take over stays, because replying without a refund is
 * still theirs to do.
 *
 * ── loading keeps the screen's shape ──
 * Before the hand-off arrives, the page has its breadcrumb and a plain
 * title, and the body is the decision panel and the run drawn as skeletons
 * in their real columns, inside one SkeletonGroup that says "Loading the
 * hand-off" once. There is no Take over yet: taking over a ticket nobody can
 * see would hand the person nothing to finish.
 *
 * ── focus follows the decision ──
 * Approving, denying and taking over each remove the button that was
 * pressed. Focus moves to the hand-off's heading, which now says what
 * happened ("Issuing the refund", "You have this ticket"), and the same
 * words go to a polite status so the later step, refund done or failed,
 * is announced when it lands without moving focus again.
 */

type Outcome = 'waiting' | 'refunding' | 'refunded' | 'refund-failed' | 'taken-over'

export interface AgentHandoffScreenProps {
  /** `null` when nothing is waiting for this person. */
  handoff?: Handoff | null
  /** The hand-off has not arrived yet: the panel and the run as skeletons. */
  loading?: boolean
  /** Whether this person may approve a refund this size. */
  canApprove?: boolean
  /** The refund the agent runs once approved. Rejects with an Error whose message is the tool's error. */
  refund?: () => Promise<void>
  /** Open in this state, for stories and screenshots. */
  defaultOutcome?: Outcome
  defaultRefundError?: string
  onReassign?: () => void
  onSendReply?: (text: string) => void
}

const at = (h: Handoff, seconds: number) => new Date(h.startedAt.getTime() + seconds * 1000)

const HEADING: Record<Outcome, string> = {
  waiting: 'The agent needs your approval',
  refunding: 'Issuing the refund',
  refunded: 'Refund issued and reply sent',
  'refund-failed': 'The refund didn’t go through',
  'taken-over': 'You have this ticket',
}

const RUN_STATUS: Record<Outcome, RunStatusValue> = {
  waiting: 'waiting',
  refunding: 'running',
  refunded: 'succeeded',
  'refund-failed': 'failed',
  'taken-over': 'cancelled',
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function steps(h: Handoff, outcome: Outcome): AgentStep[] {
  const approved = outcome === 'refunding' || outcome === 'refunded' || outcome === 'refund-failed'
  const done: AgentStep[] = [
    { id: 'read', kind: 'message', title: 'Read the ticket', status: 'succeeded', startedAt: at(h, 0), endedAt: at(h, 2) },
    {
      id: 'charges',
      kind: 'tool',
      title: 'Find the charges on the invoice',
      status: 'succeeded',
      startedAt: at(h, 2),
      endedAt: at(h, 4),
      detail: (
        <ToolCall
          name="billing.list_charges"
          status="succeeded"
          durationMs={1_840}
          args={{ invoice: h.invoice }}
          result={[
            { charge: 'ch_31a9', amount_usd: h.amountUsd, at: '2026-03-02T09:14:07Z' },
            { charge: 'ch_31b0', amount_usd: h.amountUsd, at: '2026-03-02T09:14:11Z' },
          ]}
        />
      ),
    },
    {
      id: 'policy',
      kind: 'reasoning',
      title: 'Check the refund policy',
      status: 'succeeded',
      startedAt: at(h, 4),
      endedAt: at(h, 9),
    },
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'Hand the refund to a person',
      status: outcome === 'waiting' ? 'waiting' : approved ? 'succeeded' : 'cancelled',
      startedAt: at(h, 9),
      ...(outcome === 'waiting' ? {} : { endedAt: at(h, 300) }),
    },
  ]
  if (!approved) return done
  const refundStatus: RunStatusValue = outcome === 'refunding' ? 'running' : outcome === 'refunded' ? 'succeeded' : 'failed'
  return [
    ...done,
    {
      id: 'refund',
      kind: 'tool',
      title: 'Refund the second charge',
      status: refundStatus,
      startedAt: at(h, 300),
      ...(outcome === 'refunding' ? {} : { endedAt: at(h, 302) }),
      // A failed refund's error and Retry are in the hand-off panel, where
      // the decision was made. Repeating them here, or as the run's failure,
      // would announce one failure two or three times.
      ...(outcome === 'refund-failed'
        ? {}
        : { detail: <ToolCall name="billing.issue_refund" status={refundStatus} args={{ charge: 'ch_31b0', amount_usd: h.amountUsd }} /> }),
    },
    {
      id: 'reply',
      kind: 'message',
      title: 'Send the reply',
      status: outcome === 'refunded' ? 'succeeded' : 'queued',
      ...(outcome === 'refunded' ? { startedAt: at(h, 302), endedAt: at(h, 303) } : {}),
    },
  ]
}

/** The decision panel, the conversation and the run, in their columns, before any of them has arrived. */
function HandoffSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 @4xl/handoff:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <div className="grid gap-4 bg-cloth-pale p-4 cut-frame sm:p-5">
          <Skeleton shape="text" className="h-6 w-2/3" />
          <SkeletonText lines={3} />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-96 self-start" />
    </div>
  )
}

export function AgentHandoffScreen({
  handoff = HANDOFF,
  loading = false,
  canApprove = true,
  refund = () => wait(1_200),
  defaultOutcome = 'waiting',
  defaultRefundError,
  onReassign,
  onSendReply,
}: AgentHandoffScreenProps) {
  const [outcome, setOutcome] = React.useState<Outcome>(defaultOutcome)
  const [error, setError] = React.useState<string | undefined>(defaultRefundError)
  const [announcement, setAnnouncement] = React.useState('')
  const [reply, setReply] = React.useState(handoff?.draftReply ?? '')
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const uid = React.useId()

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb={<Breadcrumb items={[{ label: 'Support', href: '#support' }, { label: 'Escalations', href: '#escalations' }]} />}
          title="Hand-off"
        />
        <SkeletonGroup loading label="Loading the hand-off" fallback={<HandoffSkeleton />} className="@container/handoff p-4 sm:p-6" />
      </>
    )
  }

  if (!handoff) {
    return (
      <>
        <PageHeader
          breadcrumb={<Breadcrumb items={[{ label: 'Support', href: '#support' }, { label: 'Escalations' }]} />}
          title="Escalations"
          description="Tickets an agent has handed to a person, oldest first."
        />
        <div className="p-4 sm:p-6">
          <EmptyState
            size="lg"
            headingLevel={2}
            title="Nothing needs you"
            description="When an agent stops for an approval or hands a ticket over, it appears here with what it wants to do and why."
          />
        </div>
      </>
    )
  }

  const h = handoff
  // Focus moves after the render that shows the new heading text: the button
  // that was pressed has just gone.
  const decide = (next: Outcome, said: string) => {
    flushSync(() => {
      setOutcome(next)
      setAnnouncement(said)
    })
    headingRef.current?.focus()
  }

  const runRefund = async () => {
    setError(undefined)
    decide('refunding', 'Approved. Issuing the refund.')
    try {
      await refund()
      setOutcome('refunded')
      setAnnouncement('Refund issued and reply sent.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setOutcome('refund-failed')
      // The failed call is an alert of its own; a status as well would say it twice.
      setAnnouncement('')
    }
  }

  const takeOver = (said: string) => decide('taken-over', said)

  const open = outcome === 'waiting' || outcome === 'refund-failed'
  const headingId = `${uid}-handoff`

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[{ label: 'Support', href: '#support' }, { label: 'Escalations', href: '#escalations' }, { label: h.ticket }]}
          />
        }
        title={h.subject}
        description={`From ${h.customer}. Handed off by ${h.agent} after five minutes on it.`}
        meta={[<RunStatus key="status" status={RUN_STATUS[outcome]} label={outcome === 'taken-over' ? 'Taken over' : undefined} />]}
        actions={
          open ? (
            <Button variant="secondary" icon={<Hand />} onClick={() => takeOver('You have this ticket. The agent has stopped.')}>
              Take over
            </Button>
          ) : undefined
        }
      />
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div className="@container/handoff p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 @4xl/handoff:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
          <div className="grid min-w-0 grid-cols-1 content-start gap-6">
            <section aria-labelledby={headingId} className="grid min-w-0 grid-cols-1 gap-4 bg-cloth-pale p-4 cut-frame sm:p-5">
              <h2
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                className="m-0 font-display text-xl font-bold leading-snug tracking-display wdth-display outline-none"
              >
                {HEADING[outcome]}
              </h2>

              {outcome === 'waiting' ? (
                <>
                  {/* Message draws a keyline above every message but a first
                      child, as the seam between turns of a thread. Here it
                      follows the card's heading, so the seam had nothing to
                      separate, and with the padding taken out the author
                      label sat on the line. The heading already opens the
                      card; the message needs neither. */}
                  <Message
                    role="assistant"
                    author={h.agent}
                    model={h.model}
                    timestamp={at(h, 9)}
                    className="border-t-0 py-0"
                  >
                    <p className="m-0 font-text text-base leading-body text-ink">{h.reason}</p>
                    <Confidence level="high" basis={h.confidenceBasis} className="mt-3" />
                  </Message>
                  {canApprove ? (
                    <ToolCall
                      name="billing.issue_refund"
                      title={`Refund ${usd.format(h.amountUsd)}`}
                      status="waiting"
                      args={{ charge: 'ch_31b0', amount_usd: h.amountUsd, reason: 'duplicate_charge' }}
                      approval={{
                        reason: `Refunds over ${usd.format(h.agentLimitUsd)} need a person. Approving issues the refund and sends the reply below.`,
                        approveLabel: 'Approve refund',
                        denyLabel: 'Deny',
                        onApprove: () => void runRefund(),
                        onDeny: () => takeOver('Refund denied. You have this ticket; nothing was sent.'),
                      }}
                    />
                  ) : (
                    <>
                      <ToolCall
                        name="billing.issue_refund"
                        title={`Refund ${usd.format(h.amountUsd)}`}
                        status="waiting"
                        args={{ charge: 'ch_31b0', amount_usd: h.amountUsd, reason: 'duplicate_charge' }}
                      />
                      <Callout
                        tone="warn"
                        title={`Refunds over ${usd.format(h.agentLimitUsd)} need a billing lead`}
                        actions={
                          <Button size="sm" variant="secondary" icon={<Users />} onClick={onReassign}>
                            Reassign to billing
                          </Button>
                        }
                      >
                        {h.approvers.join(' or ')} can approve it. You can still take the ticket over and reply without a
                        refund.
                      </Callout>
                    </>
                  )}
                </>
              ) : outcome === 'refunding' ? (
                <p className="m-0 text-sm text-ink-2">
                  The agent is refunding {usd.format(h.amountUsd)} to the card on {h.invoice}. The reply goes once the refund
                  is confirmed.
                </p>
              ) : outcome === 'refunded' ? (
                <Callout tone="success" variant="flat">
                  {usd.format(h.amountUsd)} refunded to the card on {h.invoice}, and the reply below sent to {h.customer}.
                  Approved by you.
                </Callout>
              ) : outcome === 'refund-failed' ? (
                <ToolCall
                  name="billing.issue_refund"
                  title={`Refund ${usd.format(h.amountUsd)}`}
                  status="failed"
                  args={{ charge: 'ch_31b0', amount_usd: h.amountUsd, reason: 'duplicate_charge' }}
                  {...(error ? { error } : {})}
                  onRetry={() => void runRefund()}
                />
              ) : (
                <p className="m-0 text-sm text-ink-2">
                  The agent has stopped and sent nothing. Its draft is below for you to edit and send as yourself.
                </p>
              )}
            </section>

            <section aria-labelledby={`${uid}-conversation`} className="grid min-w-0 grid-cols-1 gap-2">
              <h2 id={`${uid}-conversation`} className="m-0 font-ui text-base font-bold text-ink">
                Conversation
              </h2>
              <div className="bg-cloth-pale px-4 cut-frame">
                <Message role="user" author={h.customer} timestamp={at(h, -120)}>
                  <p className="m-0">{h.customerMessage}</p>
                </Message>
                {outcome === 'taken-over' ? null : (
                  <Message role="assistant" author={h.agent} model={h.model}>
                    <p className="m-0 mb-2">
                      {outcome === 'refunded' ? (
                        <Badge tone="success" dot>
                          Sent
                        </Badge>
                      ) : (
                        <Badge tone="warn" dot>
                          Draft, not sent
                        </Badge>
                      )}
                    </p>
                    <p className="m-0 font-text text-base leading-body text-ink">{h.draftReply}</p>
                  </Message>
                )}
              </div>
              {outcome === 'taken-over' ? (
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    onSendReply?.(reply)
                  }}
                >
                  <Field label="Your reply" hint={`Starts from the agent’s draft. Sent as you, to ${h.customer}.`}>
                    {(control) => (
                      <Textarea {...control} rows={5} value={reply} onChange={(event) => setReply(event.target.value)} />
                    )}
                  </Field>
                  <div>
                    <Button type="submit" icon={<Send />}>
                      Send reply
                    </Button>
                  </div>
                </form>
              ) : null}
            </section>
          </div>

          <AgentRun
            name={h.agent}
            runId={h.runId}
            status={RUN_STATUS[outcome]}
            startedAt={h.startedAt}
            {...(outcome === 'refunded' || outcome === 'taken-over' || outcome === 'refund-failed'
              ? { endedAt: at(h, outcome === 'taken-over' ? 300 : 303) }
              : {})}
            model={h.model}
            steps={steps(h, outcome)}
            {...(outcome === 'refunded'
              ? { summary: `Refunded ${usd.format(h.amountUsd)} and replied, after your approval.` }
              : outcome === 'taken-over'
                ? { summary: 'Stopped: you took the ticket over. Nothing was sent.' }
                : {})}
            headingLevel={2}
            className="content-start self-start"
          />
        </div>
      </div>
    </>
  )
}
