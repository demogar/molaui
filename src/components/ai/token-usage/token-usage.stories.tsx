import type { Meta, StoryObj } from '@storybook/react-vite'

import { TokenUsage } from './token-usage'

const meta = {
  title: 'AI/Token usage',
  component: TokenUsage,
  args: { input: 18_420, cached: 12_800, output: 1_204, costUsd: 0.0731, contextWindow: 200_000 },
  decorators: [(Story) => <div className="max-w-xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'What a run consumed. Token counts are compact (`12.4k`) — nobody compares the third significant figure of a token count. Cost keeps four decimals, because a fraction of a cent times a million runs is a budget line.',
          '',
          '**The context meter matters more than the spend.** Past ~80% a model starts dropping the early conversation, and the failure looks like the model “forgetting”, not like a limit. So the meter turns gold at 80% and red at 95% **and says so in words**, with the 80% line cut into the track so you see it before you cross it. It is a real `role="meter"`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof TokenUsage>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {}

export const NearTheLimit: Story = { args: { input: 168_000, output: 4_100, contextWindow: 200_000 } }

export const AtTheLimit: Story = { args: { input: 191_500, output: 3_900, contextWindow: 200_000 } }

export const Inline: Story = { args: { variant: 'inline' } }
