/**
 * STORY-ONLY. A scripted agent run: each step has a start and end offset, and
 * the run's state at time `t` is derived from the script. Deriving rather
 * than mutating keeps play / reset trivial and every frame reproducible.
 */
import { fn } from 'storybook/test'

import type { AgentStep } from '../agent-run'
import { Reasoning } from '../reasoning'
import { PartialOutput } from '../run-error'
import type { RunStatusValue } from '../run-status'
import { StreamingText } from '../streaming-text'
import { ToolCall } from '../tool-call'

import { ANSWER, QUERY_ARGS, QUERY_RESULT, REASONING } from './fixtures'
import { tokenize } from './simulate'

interface ScriptStep {
  id: string
  kind: AgentStep['kind']
  title: string
  start: number
  end: number
  render: (status: RunStatusValue, progress: number, base: number, s: ScriptStep) => AgentStep['detail']
}

export const partial = (text: string, progress: number) => {
  const tokens = tokenize(text)
  return tokens.slice(0, Math.ceil(tokens.length * Math.min(1, progress))).join('')
}

export const RUN_SCRIPT: ScriptStep[] = [
  {
    id: 'plan',
    kind: 'reasoning',
    title: 'Plan the answer',
    start: 0,
    end: 2400,
    render: (status, progress, base, s) => (
      <Reasoning
        text={partial(REASONING, progress)}
        status={status === 'succeeded' ? 'done' : 'streaming'}
        startedAt={base + s.start}
        endedAt={status === 'succeeded' ? base + s.end : undefined}
        defaultOpen
      />
    ),
  },
  {
    id: 'query',
    kind: 'tool',
    title: 'Query the experiment results',
    start: 2400,
    end: 4300,
    render: (status, _p, base, s) => (
      <ToolCall
        name="query_experiment"
        status={status}
        startedAt={base + s.start}
        endedAt={status === 'succeeded' ? base + s.end : undefined}
        args={QUERY_ARGS}
        result={status === 'succeeded' ? QUERY_RESULT : undefined}
      />
    ),
  },
  {
    id: 'brief',
    kind: 'tool',
    title: 'Read the experiment brief',
    start: 4300,
    end: 5400,
    render: (status, _p, base, s) => (
      <ToolCall
        name="search_docs"
        status={status}
        startedAt={base + s.start}
        endedAt={status === 'succeeded' ? base + s.end : undefined}
        args={{ query: 'onboarding v3 guardrails', top_k: 3 }}
        result={status === 'succeeded' ? '3 passages · docs.cayuco.internal/briefs/onboarding-v3' : undefined}
      />
    ),
  },
  {
    id: 'answer',
    kind: 'message',
    title: 'Write the answer',
    start: 5400,
    end: 10_200,
    render: (status, progress) => (
      <StreamingText text={partial(ANSWER, progress)} status={status === 'succeeded' ? 'done' : 'streaming'} className="text-base" />
    ),
  },
]

export const RUN_LENGTH = RUN_SCRIPT.at(-1)!.end

export function deriveSteps(t: number, base: number, script: readonly ScriptStep[] = RUN_SCRIPT): AgentStep[] {
  return script.map((s) => {
    const status: RunStatusValue =
      t >= s.end ? 'succeeded' : t >= s.start ? (s.kind === 'message' ? 'streaming' : 'running') : 'queued'
    const progress = Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)))
    return {
      id: s.id,
      kind: s.kind,
      title: s.title,
      status,
      startedAt: status === 'queued' ? undefined : base + s.start,
      endedAt: status === 'succeeded' ? base + s.end : undefined,
      detail: status === 'queued' ? undefined : s.render(status, progress, base, s),
      defaultOpen: s.kind === 'message',
    }
  })
}

/** A cut that lands on a list marker leaves a lone "-"; end on the words instead. */
export const cutClean = (text: string) => text.replace(/\n-\s*$/, '').trimEnd()

/** Static frames: the same run, finished, failed, held for approval, stopped, rate limited or out of time. */
export function staticSteps(
  ending: 'succeeded' | 'failed' | 'waiting' | 'cancelled' | 'rate_limited' | 'timed_out',
): AgentStep[] {
  const base = Date.parse('2026-10-05T14:01:50Z')
  const done = deriveSteps(RUN_LENGTH, base)
  if (ending === 'succeeded') return done.map((s) => ({ ...s, defaultOpen: false }))

  const first = done.slice(0, 3).map((s) => ({ ...s, defaultOpen: false }))
  const fourthStart = base + 5400
  if (ending === 'failed') {
    return [
      ...first,
      {
        id: 'segments',
        kind: 'tool',
        title: 'Break the result down by cohort',
        status: 'failed',
        durationMs: 412,
        detail: (
          <ToolCall
            name="query_warehouse"
            status="failed"
            durationMs={412}
            args={{ table: 'analytics.exp_0412_segments', group_by: 'cohort' }}
            error='PermissionDenied: role "agent_readonly" lacks SELECT on analytics.exp_0412_segments'
          />
        ),
      },
      { id: 'answer', kind: 'message', title: 'Write the answer', status: 'queued' },
    ]
  }
  if (ending === 'waiting') {
    return [
      ...done.map((s) => ({ ...s, defaultOpen: false })),
      {
        id: 'rollout',
        kind: 'approval',
        title: 'Roll variant B out to beginners',
        status: 'waiting',
        startedAt: base + RUN_LENGTH,
        detail: (
          <ToolCall
            name="update_feature_flag"
            status="waiting"
            args={{ flag: 'onboarding_puzzle_rush', variant: 'B', audience: 'self_rated_beginner', percent: 100 }}
            approval={{
              reason: 'It changes a live feature flag for every new beginner. The agent cannot undo this on its own.',
              onApprove: fn(),
              onDeny: fn(),
            }}
          />
        ),
      },
    ]
  }
  if (ending === 'rate_limited') {
    return [
      ...first,
      { id: 'answer', kind: 'message', title: 'Write the answer', status: 'failed', durationMs: 240, startedAt: fourthStart, endedAt: fourthStart + 240 },
    ]
  }
  // Stopped part-way through the answer: what arrived is kept, and marked.
  const partialAnswer = (progress: number, note: string) => (
    <PartialOutput note={note}>
      <StreamingText text={cutClean(partial(ANSWER, progress))} status="done" className="text-base" />
    </PartialOutput>
  )
  if (ending === 'timed_out') {
    return [
      ...first,
      {
        id: 'answer',
        kind: 'message',
        title: 'Write the answer',
        status: 'timed_out',
        durationMs: 30_000,
        startedAt: fourthStart,
        endedAt: fourthStart + 30_000,
        detail: partialAnswer(0.45, 'Output stops here: the model did not finish within 30 seconds.'),
        defaultOpen: true,
      },
    ]
  }
  return [
    ...first,
    {
      id: 'answer',
      kind: 'message',
      title: 'Write the answer',
      status: 'cancelled',
      durationMs: 1730,
      startedAt: fourthStart,
      endedAt: fourthStart + 1730,
      detail: partialAnswer(0.3, 'Output stops here: you stopped the run.'),
      defaultOpen: true,
    },
  ]
}

/** 0–1 progress of one scripted step at time `t`. */
export function stepProgress(t: number, id: string): number {
  const s = RUN_SCRIPT.find((step) => step.id === id)
  if (!s) return 0
  return Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)))
}

export function stepWindow(id: string): { start: number; end: number } {
  const s = RUN_SCRIPT.find((step) => step.id === id)!
  return { start: s.start, end: s.end }
}

/* ── failure and recovery ────────────────────────────────────────────
 * The same run with a fourth step — a warehouse query by cohort — that is
 * denied on the first attempt. The failed frame is derived from the script
 * like every other frame, so retrying from that step is "carry on deriving
 * from the step's start time", and the steps before it keep the output they
 * already produced. */

const SEGMENT_ARGS = { table: 'analytics.exp_0412_segments', group_by: 'cohort' }
export const SEGMENT_ERROR = 'PermissionDenied: role "agent_readonly" lacks SELECT on analytics.exp_0412_segments'

export const RECOVERY_SCRIPT: ScriptStep[] = [
  ...RUN_SCRIPT.slice(0, 3),
  {
    id: 'segments',
    kind: 'tool',
    title: 'Break the result down by cohort',
    start: 5400,
    end: 6600,
    render: (status, _p, base, s) => (
      <ToolCall
        name="query_warehouse"
        status={status}
        startedAt={base + s.start}
        endedAt={status === 'succeeded' ? base + s.end : undefined}
        args={SEGMENT_ARGS}
        result={status === 'succeeded' ? { rows: 2, beginner: '+4.1 pts', imported_rating: '+0.4 pts' } : undefined}
      />
    ),
  },
  ...RUN_SCRIPT.slice(3).map((s) => ({ ...s, start: s.start + 1200, end: s.end + 1200 })),
]

export const RECOVERY_LENGTH = RECOVERY_SCRIPT.at(-1)!.end
/** Script time at which the first attempt at the segments query is denied. */
export const RECOVERY_FAILS_AT = 5812
export const RECOVERY_RESUMES_AT = 5400

/**
 * The run at script time `t`. On the first attempt it stops at
 * `RECOVERY_FAILS_AT`: the segments step failed, the answer never started.
 * After a retry from that step, `t` simply carries on from its start.
 */
export function deriveRecoverySteps(t: number, base: number, firstAttempt: boolean): AgentStep[] {
  if (!firstAttempt || t < RECOVERY_FAILS_AT) return deriveSteps(t, base, RECOVERY_SCRIPT)
  return deriveSteps(RECOVERY_RESUMES_AT, base, RECOVERY_SCRIPT).map((s) =>
    s.id === 'segments'
      ? {
          ...s,
          status: 'failed' as const,
          startedAt: base + RECOVERY_RESUMES_AT,
          endedAt: base + RECOVERY_FAILS_AT,
          detail: (
            <ToolCall
              name="query_warehouse"
              status="failed"
              startedAt={base + RECOVERY_RESUMES_AT}
              endedAt={base + RECOVERY_FAILS_AT}
              args={SEGMENT_ARGS}
              error={SEGMENT_ERROR}
            />
          ),
        }
      : s,
  )
}
