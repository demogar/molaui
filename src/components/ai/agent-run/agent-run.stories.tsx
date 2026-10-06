import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../../button'
import { RUN_LENGTH, deriveSteps, staticSteps } from '../_story-data/run-script'
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
    model: 'mola-research-2',
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
        model="mola-research-2"
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

export const FailedAtStepFour: Story = {
  args: { status: 'failed', endedAt: BASE + 5812, steps: staticSteps('failed') },
}

export const WaitingForApproval: Story = {
  args: { status: 'waiting', endedAt: undefined, startedAt: Date.now() - 64_000, steps: staticSteps('waiting') },
}

export const Cancelled: Story = {
  args: { status: 'cancelled', endedAt: BASE + 7130, steps: staticSteps('cancelled') },
}
