/**
 * STORY-ONLY. A scripted agent run: each step has a start and end offset, and
 * the run's state at time `t` is derived from the script. Deriving rather
 * than mutating keeps play / reset trivial and every frame reproducible.
 */
import { fn } from 'storybook/test'

import type { AgentStep } from '../agent-run'
import { Reasoning } from '../reasoning'
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

export function deriveSteps(t: number, base: number): AgentStep[] {
  return RUN_SCRIPT.map((s) => {
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

/** Static frames: the same run, finished, failed, held for approval, or stopped. */
export function staticSteps(ending: 'succeeded' | 'failed' | 'waiting' | 'cancelled'): AgentStep[] {
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
            onRetry={fn()}
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
  return [
    ...first,
    { id: 'answer', kind: 'message', title: 'Write the answer', status: 'cancelled', durationMs: 1730, startedAt: fourthStart, endedAt: fourthStart + 1730 },
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
