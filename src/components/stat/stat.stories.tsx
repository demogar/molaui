import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stat, StatGroup } from './stat'

const meta = {
  title: 'Components/Data display/Stat',
  component: Stat,
  args: {
    label: 'Runs today',
    value: '1,204',
    delta: { value: '12%', direction: 'up', sentiment: 'positive', period: 'vs yesterday' },
    trend: [820, 910, 870, 1010, 980, 1090, 1204],
  },
  parameters: {
    docs: {
      description: {
        component:
          'A KPI tile. **Direction is not sentiment**: latency going up is bad, cost going down is good — so the arrow follows `direction`, the colour follows `sentiment`, and the caller states both. Colour is never alone: a hidden sentence reads "Up 12%, vs yesterday, an improvement".',
      },
    },
  },
} satisfies Meta<typeof Stat>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
}

export const Group: Story = {
  render: () => (
    <StatGroup columns={4}>
      <Stat
        label="Runs today"
        value="1,204"
        delta={{ value: '12%', direction: 'up', sentiment: 'positive', period: 'vs yesterday' }}
        trend={[820, 910, 870, 1010, 980, 1090, 1204]}
      />
      <Stat
        label="Success rate"
        value="97.8"
        unit="%"
        delta={{ value: '0.4 pt', direction: 'down', sentiment: 'negative', period: 'vs yesterday' }}
        trend={[98.6, 98.4, 98.9, 98.1, 98.3, 98.2, 97.8]}
      />
      <Stat
        label="p95 duration"
        value="4m 12s"
        delta={{ value: '38s', direction: 'down', sentiment: 'positive', period: 'vs yesterday' }}
        trend={[310, 290, 305, 280, 276, 268, 252]}
      />
      <Stat
        label="Spend"
        value="$142.08"
        delta={{ value: '0%', direction: 'flat', period: 'vs yesterday' }}
        hint="Budget $400 / day"
      />
    </StatGroup>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Tiles cut from one panel: one ink keyline around the group, quiet keylines between. Four separate cards would put eight ink edges where the eye needs one. Note the duration going *down* in green and the success rate going *down* in red.',
      },
    },
  },
}

export const WithoutTrend: Story = {
  render: () => (
    <StatGroup columns={3}>
      <Stat label="Documents indexed" value="18,442" hint="Last sync 4 minutes ago" />
      <Stat label="Open escalations" value="7" />
      <Stat label="Tokens this month" value="412.6" unit="M" />
    </StatGroup>
  ),
}
