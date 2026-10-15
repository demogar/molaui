import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { ANSWER } from '../_story-data/fixtures'
import { SEGMENT_ERROR, cutClean, partial } from '../_story-data/run-script'
import { StreamingText } from '../streaming-text'
import { HardState, HardStates as HardStatesFrame } from '../../../docs/blocks/hard-states'

import { PartialOutput, RunError } from './run-error'

const meta = {
  title: 'AI/Run error',
  tags: ['stable'],
  component: RunError,
  args: {
    step: 'Break the result down by plan',
    stepNumber: 4,
    stepCount: 5,
    tool: 'query_warehouse',
    error: SEGMENT_ERROR,
    runId: 'run_01JA4R7M2KQ8',
    at: Date.parse('2026-10-05T14:01:55.812Z'),
    onRetry: fn(),
    onRetryFromStep: fn(),
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'What stopped a run, said plainly, with the way back next to it. `AgentRun` renders one above its steps when given `failure`; it also stands alone.',
          '',
          '- **The step, a sentence, then the literal.** The headline names the step by number and in words, to match the timeline. One sentence says what happened; the error follows verbatim, `dir="ltr"`, so a right-to-left page cannot reorder it. “Something went wrong” is not one of the sentences.',
          '- **Three ways back, in order of cost.** *Retry from step N* keeps the work before the step, so it is primary; *Retry run* starts from nothing; *Copy error details* puts run, step, tool, error and time on the clipboard as plain text and says so once.',
          '- **Four reasons, because the next move differs.** Failed, rate limited, timed out, cancelled. A rate limit is a reason on a failed run rather than a ninth status: it keeps the failed mark and says “Rate limited” in words.',
          '- **A countdown is announced at milestones, not every second.** The figure ticks in tabular numerals as ordinary text; the wait is spoken with the error, at ten seconds and at zero. Without `autoRetry` the buttons stay disabled until zero, and the sentence says why.',
          '- **A cancellation is not an error.** No rojo wash, no alert, nothing to copy.',
          '- `PartialOutput` keeps what arrived before the stop, labelled as partial with a rule where it ends, so half a paragraph is never read as the conclusion.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof RunError>

export default meta
type Story = StoryObj<typeof meta>

export const Failed: Story = {}

function Countdown(props: React.ComponentProps<typeof RunError> & { seconds: number }) {
  const { seconds, ...rest } = props
  const [retryAt] = React.useState(() => Date.now() + seconds * 1000)
  return <RunError {...rest} retryAt={retryAt} />
}

export const RateLimited: Story = {
  render: (args) => <Countdown {...args} seconds={45} />,
  args: {
    kind: 'rate_limited',
    step: 'Write the answer',
    stepNumber: 4,
    stepCount: 4,
    tool: undefined,
    error: '429 rate_limit_exceeded: 40,000 output tokens per minute for workspace support-ops',
    autoRetry: true,
  },
}

export const TimedOut: Story = {
  render: (args) => <Countdown {...args} seconds={20} />,
  args: { kind: 'timed_out', tool: 'fetch_dashboard', step: 'Read the guardrail dashboard', error: 'deadline exceeded after 30s' },
  parameters: {
    docs: { description: { story: 'A manual cooldown: the buttons are disabled until it ends, and the line above them says for how long.' } },
  },
}

export const Cancelled: Story = {
  args: { kind: 'cancelled', step: 'Write the answer', stepNumber: 4, stepCount: 4, tool: undefined, error: undefined },
}

export const WithoutAStep: Story = {
  args: { step: undefined, stepNumber: undefined, stepCount: undefined, tool: undefined, onRetryFromStep: undefined },
  parameters: {
    docs: { description: { story: 'A run that failed before its first step: the headline falls back to “The run failed.” and only *Retry run* is offered.' } },
  },
}

export const PartialAnswer: Story = {
  render: () => (
    <PartialOutput note="Output stops here: the model did not finish within 30 seconds.">
      <StreamingText text={cutClean(partial(ANSWER, 0.45))} status="done" className="text-base" />
    </PartialOutput>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => {
    const shared = { runId: 'run_01JA4R7M2KQ8', at: Date.parse('2026-10-05T14:01:55.812Z'), onRetry: fn(), onRetryFromStep: fn() }
    return (
      <HardStatesFrame>
        <HardState state="long-label">
          <RunError
            {...shared}
            step="Break the ticket rate down by plan, signup cohort and help panel variant for every Starter workspace"
            stepNumber={4}
            stepCount={5}
            tool="query_warehouse"
            error={SEGMENT_ERROR}
          />
        </HardState>
        <HardState state="rtl">
          <RunError {...shared} step="قراءة لوحة المؤشرات" stepNumber={2} stepCount={5} tool="fetch_dashboard" error="deadline exceeded after 30s" />
        </HardState>
        <HardState state="disabled">
          <Countdown
            {...shared}
            seconds={120}
            kind="timed_out"
            step="Read the guardrail dashboard"
            stepNumber={3}
            stepCount={5}
            tool="fetch_dashboard"
            error="deadline exceeded after 30s"
          />
        </HardState>
        <HardState state="error">
          <RunError {...shared} step="Write the answer" stepNumber={5} stepCount={5} tool={undefined} error="500 internal_error: upstream model unavailable" />
        </HardState>
      </HardStatesFrame>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          'A long step name wraps in the headline and the error literal breaks anywhere rather than widening the panel; in right to left the headline and the buttons mirror while the error text stays left to right, so a right-to-left page cannot reorder it; disabled is a manual cooldown, the buttons waiting with the line above them saying for how long; the error is a plain failure with all three ways back.',
      },
    },
  },
}
