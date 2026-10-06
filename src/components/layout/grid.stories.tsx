import type { Meta, StoryObj } from '@storybook/react-vite'

import { Grid } from './grid'

const cells = Array.from({ length: 8 }, (_, i) => i + 1)

const meta = {
  title: 'Components/Layout/Grid',
  component: Grid,
  args: { cols: 'auto', gap: 'default', minItem: '200px' },
  argTypes: {
    cols: { control: 'inline-radio', options: ['halves', 'thirds', 'quarters', 'fifths', 'auto'] },
    gap: { control: 'inline-radio', options: ['tight', 'default', 'wide', 'seamless'] },
  },
  render: (args) => (
    <Grid {...args}>
      {cells.map((n) => (
        <div key={n} className="bg-cloth-pale p-4 text-sm tabular shadow-cut">
          Cell {n}
        </div>
      ))}
    </Grid>
  ),
  parameters: {
    docs: {
      description: {
        component:
          '`auto` is the one tools reach for: as many columns of at least `minItem` as fit — never a breakpoint. `seamless` cuts all the cells from one panel, so neighbours share a single keyline instead of doubling it.',
      },
    },
  },
} satisfies Meta<typeof Grid>

export default meta
type Story = StoryObj<typeof meta>

export const Auto: Story = {}

export const Seamless: Story = {
  args: { gap: 'seamless', cols: 'quarters' },
  render: (args) => (
    <Grid {...args}>
      {cells.map((n) => (
        <div key={n} className="bg-cloth-pale p-4 text-sm tabular">
          Cell {n}
        </div>
      ))}
    </Grid>
  ),
}
