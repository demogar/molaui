import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { REASONING } from '../_story-data/fixtures'
import { HardState, HardStates as HardStatesFrame } from '../../../docs/blocks/hard-states'
import { useSimulatedStream } from '../_story-data/simulate'

import { Reasoning } from './reasoning'

const meta = {
  title: 'AI/Reasoning',
  tags: ['stable'],
  component: Reasoning,
  args: { text: REASONING, status: 'done', durationMs: 12_400 },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component:
          'The model’s thinking, behind a disclosure. Reasoning is *evidence*, not the answer: useful when the answer looks wrong, noise when it looks right. So it is closed by default and summarised in one line — “Thought for 12.4s” — the fact most readers want from it. Open it and the thought is set in the muted reading voice, a step quieter than the answer it leads to.',
      },
    },
  },
} satisfies Meta<typeof Reasoning>

export default meta
type Story = StoryObj<typeof meta>

export const Done: Story = {}

export const Opened: Story = { args: { defaultOpen: true } }

function Thinking() {
  const stream = useSimulatedStream(REASONING, { autoStart: true, intervalMs: 70 })
  const [startedAt] = React.useState(() => Date.now())
  return (
    <Reasoning
      text={stream.text}
      status={stream.status === 'streaming' ? 'streaming' : 'done'}
      startedAt={startedAt}
      endedAt={stream.status === 'done' ? startedAt + 4_000 : undefined}
      defaultOpen
    />
  )
}

export const Thinking_: Story = { name: 'Thinking (live)', render: () => <Thinking /> }

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Reasoning text={REASONING} status="done" durationMs={12_400} defaultOpen />
      </HardState>
      <HardState state="rtl">
        <Reasoning text="قارنت معدل التذاكر قبل الإطلاق وبعده." status="done" durationMs={4_200} defaultOpen />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long thought, opened at a phone’s width, wraps in the reading voice with no sideways scroll; in right to left the disclosure chevron and the duration change sides. Reasoning has no disabled and no error state: it is evidence that arrived, and a failed run is shown by the run, not by its thinking.',
      },
    },
  },
}
