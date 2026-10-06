import type { Meta, StoryObj } from '@storybook/react-vite'

import { Slider } from './slider'

const meta = {
  title: 'Components/Forms/Slider',
  component: Slider,
  args: {
    label: 'Temperature',
    defaultValue: 0.7,
    min: 0,
    max: 1,
    step: 0.05,
    minLabel: 'Precise',
    maxLabel: 'Creative',
  },
  parameters: {
    docs: {
      description: {
        component:
          'The track is a cut groove with the chosen span in ink; the thumb is a square that reveals the gold band when grabbed. The value is **always printed**, in tabular figures — a slider whose number can only be learned by dragging is a control for guessing.',
      },
    },
  },
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="max-w-sm">
      <Slider {...args} />
    </div>
  ),
}

export const Percentage: Story = {
  args: {
    label: 'Rollout',
    defaultValue: 25,
    min: 0,
    max: 100,
    step: 5,
    minLabel: undefined,
    maxLabel: undefined,
    formatValue: (text) => `${text}% of workspaces`,
  },
  render: (args) => (
    <div className="max-w-sm">
      <Slider {...args} />
    </div>
  ),
}

export const Range: Story = {
  args: {
    label: 'Monthly tickets',
    defaultValue: [1200, 1800],
    min: 400,
    max: 3000,
    step: 50,
    minLabel: '400',
    maxLabel: '3000',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Slider {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="max-w-sm">
      <Slider {...args} />
    </div>
  ),
}
