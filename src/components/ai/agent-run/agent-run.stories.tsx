import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../../button'
import {
  RECOVERY_FAILS_AT,
  RECOVERY_LENGTH,
  RECOVERY_RESUMES_AT,
  RUN_LENGTH,
  SEGMENT_ERROR,
  deriveRecoverySteps,
  deriveSteps,
  staticSteps,
} from '../_story-data/run-script'
import { useStoryClock } from '../_story-data/simulate'
import type { RunStatusValue } from '../run-status'

import { AgentRun } from './agent-run'

const BASE = Date.parse('2026-10-05T14:01:50Z')
const USAGE = { input: 18_420, output: 1_204, cached: 12_800, costUsd: 0.0731, contextWindow: 200_000 }

const meta = {
  title: 'AI/Agent run',
  component: AgentRun,
  args: {
    name: 'Cayuco research agent',
    runId: 'run_01JA4R7M2KQ8',
    model: 'cayuco-deep-3',
    status: 'succeeded',
    startedAt: BASE,
    endedAt: BASE + RUN_LENGTH,
    usage: USAGE,
    steps: staticSteps('succeeded'),
    onCancel: fn(),
    onRetry: fn(),
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'A long-running agent run, as a timeline. The questions an operator brings to a run are never “what percentage” — there isn’t one. They are: **is it still working, what is it doing right now, how long has that taken, and does it need me.** The layout answers them in that order.',
          '',
          '- The header carries the run’s status with a clock that keeps counting, *Cancel run* while it is open and *Retry run* once it failed or was stopped.',
          '- Steps hang off one spine, as an ordered list. Each node is the step’s status glyph. The spine is **solid ink through finished work and a pale keyline through work not yet started**, so how far the run has got is a shape you see before you read anything.',
          '- The active step carries the working relleno and a live clock; finished steps show fixed durations in tabular figures, aligned right so they compare down the column.',
          '- A failed step or one waiting for approval opens itself.',
          '- **When it stops, the reason comes first.** `failure` puts a `RunError` between the header and the steps: the step by number and in words, a plain sentence, the error verbatim, and *Retry from step N*, *Retry run* and *Copy error details*. It takes over the header’s Retry, so the retry sits next to its reason. Nothing that already arrived is cleared.',
          '- The run announces its own status changes once each. Steps are not announced: forty steps would talk over the operator for a minute.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof AgentRun>

export default meta
type Story = StoryObj<typeof meta>

function LiveRun() {
  const [playing, setPlaying] = React.useState(true)
  const [base, setBase] = React.useState(() => Date.now())
  const clock = useStoryClock(playing)
  const t = Math.min(clock.t, RUN_LENGTH)
  const [cancelled, setCancelled] = React.useState(false)

  const finished = t >= RUN_LENGTH
  if (finished && playing) setPlaying(false)

  const status: RunStatusValue = cancelled ? 'cancelled' : finished ? 'succeeded' : 'running'
  const steps = deriveSteps(t, base).map((s) =>
    cancelled && (s.status === 'running' || s.status === 'streaming') ? { ...s, status: 'cancelled' as const, endedAt: base + t } : s,
  )

  const restart = () => {
    clock.reset()
    setBase(Date.now())
    setCancelled(false)
    setPlaying(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" icon={finished || cancelled ? <RotateCcw /> : <Play />} onClick={restart}>
          {finished || cancelled ? 'Run again' : 'Restart'}
        </Button>
      </div>
      <AgentRun
        name="Cayuco research agent"
        runId="run_01JA4R7M2KQ8"
        model="cayuco-deep-3"
        status={status}
        startedAt={base}
        endedAt={finished || cancelled ? base + t : undefined}
        usage={{ ...USAGE, input: Math.round(USAGE.input * Math.min(1, t / 5400 + 0.2)), output: Math.round(USAGE.output * Math.max(0, (t - 5400) / 4800)) }}
        steps={steps}
        onCancel={() => {
          setCancelled(true)
          setPlaying(false)
        }}
        onRetry={restart}
        summary={<p className="m-0 font-ui text-sm text-ink-2">Answered with 3 sources. One guardrail flagged for review.</p>}
      />
    </div>
  )
}

export const Live: Story = {
  render: () => <LiveRun />,
  parameters: {
    docs: {
      description: {
        story: 'A ten-second scripted run: plan, two tool calls, a streamed answer. Try **Cancel run** mid-way, then **Retry run**.',
      },
    },
  },
}

export const Succeeded: Story = {
  args: { summary: <p className="m-0 font-ui text-sm text-ink-2">Answered with 3 sources. One guardrail flagged for review.</p> },
}

const SEGMENT_FAILURE = { stepId: 'segments', tool: 'query_warehouse', error: SEGMENT_ERROR, at: BASE + 5812 }

export const FailedAtStepFour: Story = {
  args: { status: 'failed', endedAt: BASE + 5812, steps: staticSteps('failed'), failure: SEGMENT_FAILURE, onRetryFromStep: fn() },
}

export const RateLimited: Story = {
  render: function Render(args) {
    // Relative to when the story opens, so the countdown is always running.
    const [retryAt] = React.useState(() => Date.now() + 45_000)
    return <AgentRun {...args} failure={{ ...args.failure, retryAt }} />
  },
  args: {
    status: 'failed',
    endedAt: BASE + 5640,
    steps: staticSteps('rate_limited'),
    failure: { stepId: 'answer', kind: 'rate_limited', autoRetry: true, error: '429 rate_limit_exceeded: 40,000 output tokens per minute for workspace support-ops' },
    onRetryFromStep: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The model provider refused the call. A rate limit is a *reason* on a failed run, not a status of its own: it keeps the failed mark and says “Rate limited” in words. The countdown ticks in tabular figures but is announced only three times — with the error, at ten seconds and at zero — and at zero the run retries from the step by itself.',
      },
    },
  },
}

export const TimedOut: Story = {
  render: function Render(args) {
    const [retryAt] = React.useState(() => Date.now() + 20_000)
    return <AgentRun {...args} failure={{ ...args.failure, retryAt }} />
  },
  args: {
    status: 'timed_out',
    endedAt: BASE + 35_400,
    steps: staticSteps('timed_out'),
    failure: { stepId: 'answer', kind: 'timed_out', error: 'deadline exceeded after 30s (stream idle 12.4s)' },
    onRetryFromStep: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The answer ran out of time part-way through. What arrived is kept and marked as partial, with a rule saying where it stops, so a half-written paragraph is never mistaken for the conclusion. Without `autoRetry` the retry buttons wait out the cooldown disabled, and the sentence above them says for how long.',
      },
    },
  },
}

export const WaitingForApproval: Story = {
  args: { status: 'waiting', endedAt: undefined, startedAt: Date.now() - 64_000, steps: staticSteps('waiting') },
}

export const Cancelled: Story = {
  args: {
    status: 'cancelled',
    endedAt: BASE + 7130,
    steps: staticSteps('cancelled'),
    failure: { stepId: 'answer', kind: 'cancelled' },
    onRetryFromStep: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Stopped by a person, not broken: no rojo, no alert, nothing to copy. The partial answer stays, marked as partial.',
      },
    },
  },
}

type Attempt = 'first' | 'resumed' | 'restarted'

function RecoveryRun() {
  const [attempt, setAttempt] = React.useState<Attempt>('first')
  const [startedAt, setStartedAt] = React.useState(() => Date.now())
  // Step timestamps are derived from `base`; on a resume it is shifted so the
  // retried step starts now and the steps before it keep their durations.
  const [base, setBase] = React.useState(startedAt)
  const [from, setFrom] = React.useState(0)
  const [playing, setPlaying] = React.useState(true)
  const clock = useStoryClock(playing)

  const t = Math.min(from + clock.t, attempt === 'first' ? RECOVERY_FAILS_AT : RECOVERY_LENGTH)
  const failed = attempt === 'first' && t >= RECOVERY_FAILS_AT
  const finished = t >= RECOVERY_LENGTH
  if ((failed || finished) && playing) setPlaying(false)

  const status: RunStatusValue = failed ? 'failed' : finished ? 'succeeded' : 'running'
  const steps = deriveRecoverySteps(t, base, attempt === 'first')

  const run = (next: Attempt, at: number) => {
    const now = Date.now()
    clock.reset()
    setAttempt(next)
    setFrom(at)
    setBase(now - at)
    if (next !== 'resumed') setStartedAt(now)
    setPlaying(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={() => run('first', 0)}>
          Start over
        </Button>
      </div>
      <AgentRun
        name="Cayuco research agent"
        runId="run_01JA4R7M2KQ9"
        model="cayuco-deep-3"
        status={status}
        startedAt={startedAt}
        endedAt={failed || finished ? base + t : undefined}
        steps={steps}
        failure={failed ? { stepId: 'segments', tool: 'query_warehouse', error: SEGMENT_ERROR, at: base + RECOVERY_FAILS_AT } : undefined}
        onRetryFromStep={() => run('resumed', RECOVERY_RESUMES_AT)}
        onRetry={() => run('restarted', 0)}
        summary={
          finished ? (
            <p className="m-0 font-ui text-sm text-ink-2">
              {attempt === 'resumed' ? 'Answered after one retry from step 4. Steps 1–3 were not run again.' : 'Answered with 3 sources.'}
            </p>
          ) : undefined
        }
      />
    </div>
  )
}

export const FailureAndRecovery: Story = {
  render: () => <RecoveryRun />,
  parameters: {
    docs: {
      description: {
        story:
          'The scripted run, with a warehouse query that is denied on its first attempt. The run stops at step 4 and says so above the timeline; the plan and the two queries that already succeeded keep their output. **Retry from step 4** carries on from that step — steps 1–3 are not run again — and the run completes. **Retry run** starts from nothing.',
      },
    },
  },
}
