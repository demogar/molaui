import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { REASONING } from '../_story-data/fixtures'
import { useSimulatedStream } from '../_story-data/simulate'

import { Reasoning } from './reasoning'

const meta = {
  title: 'AI/Reasoning',
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
