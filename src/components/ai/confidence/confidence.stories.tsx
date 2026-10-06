import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../../button'

import { Confidence, UncertaintyNote } from './confidence'

const meta = {
  title: 'AI/Confidence',
  component: Confidence,
  args: { level: 'high', basis: '3 sources agree' },
  parameters: {
    docs: {
      description: {
        component: [
          'How uncertainty surfaces. **Three levels, never a percentage.** “87.3% confident” claims a calibration no language model has, and a precise number gets treated as a measurement. Three coarse levels say what can honestly be said; the `basis` says why, which is the part an operator can check. Segments differ in count, not only colour.',
          '',
          '`UncertaintyNote` sits in the answer next to the claim it qualifies. It is añil, the informational layer — **not** gold or red: uncertainty is not an alarm, and dressing it as one teaches people to ignore it. It says what to verify and, ideally, offers the action that verifies it.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof Confidence>

export default meta
type Story = StoryObj<typeof meta>

export const Levels: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Confidence level="high" basis="3 sources agree" />
      <Confidence level="medium" basis="sources disagree on the cohort size" />
      <Confidence level="low" basis="single source, 9 months old" />
    </div>
  ),
}

export const Note: Story = {
  render: () => (
    <UncertaintyNote
      title="Unverified figure"
      className="max-w-xl"
      action={
        <Button size="sm" variant="secondary" withArrow>
          Open the guardrail dashboard
        </Button>
      }
    >
      The 40-second slowdown comes from one summary row. The per-day data was not available to the agent, so check it before you ship.
    </UncertaintyNote>
  ),
}
