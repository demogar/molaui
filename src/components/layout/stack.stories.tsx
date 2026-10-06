import type * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '../badge'
import { Button } from '../button'
import { Inline, RowBetween, Stack } from './stack'

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-cloth-pale px-3 py-2 text-sm shadow-cut">{children}</div>
)

const meta = {
  title: 'Components/Layout/Stack',
  component: Stack,
  args: { gap: 'md' },
  argTypes: { gap: { control: 'inline-radio', options: ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl'] } },
  render: (args) => (
    <Stack {...args} className="max-w-xs">
      <Box>One</Box>
      <Box>Two</Box>
      <Box>Three</Box>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'Seven gaps, named by role. Every step is a spacing multiple, so it scales with density. A layout that needs an eighth needs a divider, not another number. `Inline` wraps by default: a row of controls that cannot wrap is what forced a 508px document onto a 390px phone in the product this system came from.',
      },
    },
  },
} satisfies Meta<typeof Stack>

export default meta
type Story = StoryObj<typeof meta>

export const Column: Story = {}

export const InlineToolbar: Story = {
  render: () => (
    <Inline gap="xs" className="max-w-md">
      <Button size="sm">Run</Button>
      <Button size="sm" variant="secondary">
        Duplicate
      </Button>
      <Button size="sm" variant="secondary">
        Export
      </Button>
      <Badge tone="info" dot>
        Draft
      </Badge>
    </Inline>
  ),
}

export const PanelHeader: Story = {
  render: () => (
    <RowBetween className="max-w-xl bg-cloth-pale p-4 shadow-cut">
      <span className="font-display text-lg font-semibold">Run history</span>
      <Button size="sm" variant="secondary">
        Export CSV
      </Button>
    </RowBetween>
  ),
}
