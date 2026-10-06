import type { Meta as StoryMeta, StoryObj } from '@storybook/react-vite'

import { Meta } from './meta'

const meta = {
  title: 'Components/Typography/Meta',
  component: Meta,
  args: { children: '2.4 s · 3,812 tokens · $0.014' },
  parameters: {
    docs: {
      description: {
        component:
          'Duration, cost, count, timestamp — facts compared down a column, so they carry tabular figures. This is the job a monospace usually does in tool UIs, minus the costume.',
      },
    },
  },
} satisfies StoryMeta<typeof Meta>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
