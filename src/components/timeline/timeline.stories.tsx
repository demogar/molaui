import type { Meta, StoryObj } from '@storybook/react-vite'

import { StepList, Timeline } from './timeline'

const meta = {
  title: 'Components/Data display/Timeline',
  component: Timeline,
  parameters: {
    docs: {
      description: {
        component:
          'A spine beside the events it connects. Always an `<ol>` — the order is the content. The connector stops at the last event, because a line running past the final stop is what makes a timeline look unfinished. Nodes are cut squares toned by outcome; the **active** node carries working relleno, the step happening now rather than merely the latest.',
      },
    },
  },
  args: {
    label: 'Experiment history',
    items: [
      { meta: 'Oct 1 · 09:12', title: 'Experiment drafted', description: 'Coach note after first loss — 10% of new players.', tone: 'neutral' },
      { meta: 'Oct 1 · 15:40', title: 'Review approved', description: 'Guardrail added: support tickets per 1,000 players.', tone: 'success' },
      { meta: 'Oct 2 · 08:00', title: 'Rollout paused', description: 'Coach agent latency above 6s at p95.', tone: 'warn' },
      { meta: 'Oct 3 · 11:24', title: 'Rollback of agent v14', description: 'Prompt regression; restored v13.', tone: 'danger' },
      { meta: 'Now', title: 'Collecting day-7 data', description: '4 of 7 days elapsed.', tone: 'active' },
    ],
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Flush: Story = { args: { gap: 'flush' } }

export const Editorial: Story = {
  args: {
    size: 'editorial',
    label: 'Route',
    gap: 'spaced',
    items: [
      { meta: 'Day 1–2', title: 'Panama City', description: 'Casco Viejo on foot, the canal at Miraflores before the midday heat.' },
      { meta: 'Day 3', title: 'Boquete', description: 'Cloud forest, coffee farms, a morning on the Quetzal trail.' },
      { meta: 'Day 4–5', title: 'Bocas del Toro', description: 'Water taxis between islands; snorkel the reef at Cayo Zapatilla.' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'The scale the component was born at, in Must Do Panama — kept for narrative sequences, with the reading voice for the notes.',
      },
    },
  },
}

export const Steps: StoryObj<typeof StepList> = {
  render: () => (
    <StepList
      items={[
        { title: 'Freeze the agent version', note: 'Pin the prompt and model id so the rollback target is known.' },
        { title: 'Shadow 5% of traffic', note: 'Compare answers with the current agent; nothing is shown to players.' },
        { title: 'Ramp to 50%', note: 'Only if the guardrail holds for 48 hours.' },
        { title: 'Retire the old version' },
      ]}
    />
  ),
}

export const StepsInverse: StoryObj<typeof StepList> = {
  render: () => (
    <StepList
      tone="inverse"
      titleAs="p"
      items={[
        { label: 'Before', title: 'Write the hypothesis down', note: 'One sentence, one metric.' },
        { label: 'During', title: 'Watch the guardrail, not the goal' },
        { label: 'After', title: 'Publish the result, especially if it lost' },
      ]}
    />
  ),
}
