import type { Meta, StoryObj } from '@storybook/react-vite'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { DirectionProvider } from '../../lib/direction'
import { Slider } from './slider'

const meta = {
  title: 'Components/Forms/Slider',
  tags: ['stable'],
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

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Slider
          label="Share of new workspaces that get the retrained refund-triage agent"
          defaultValue={25}
          min={0}
          max={100}
          step={5}
          formatValue={(text) => `${text}% of new workspaces`}
          minLabel="Nobody yet"
          maxLabel="Every new workspace"
        />
      </HardState>
      <HardState state="rtl">
        <DirectionProvider direction="rtl">
          <Slider label="درجة الحرارة" defaultValue={0.7} min={0} max={1} step={0.05} minLabel="دقيق" maxLabel="مبدع" />
        </DirectionProvider>
      </HardState>
      <HardState state="disabled">
        <Slider label="Temperature" disabled defaultValue={0.7} min={0} max={1} step={0.05} minLabel="Precise" maxLabel="Creative" />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long label wraps and the printed value wraps beside it rather than overlapping; the end labels sit under their ends. In right to left, inside `DirectionProvider`, the minimum is at the right and the ink span grows leftward. Disabled keeps its keyline, its value and its span, in muted ink. There is no error cell: a slider can only hold a value inside its own bounds, so there is no invalid value for it to show.',
      },
    },
  },
}
