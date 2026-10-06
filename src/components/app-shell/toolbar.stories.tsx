import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlignLeft, Bold, Code, Copy, Italic, Link2, Play, Square, Trash2 } from 'lucide-react'

import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from './toolbar'

const meta = {
  title: 'Components/Layout/Toolbar',
  component: Toolbar,
  args: { 'aria-label': 'Run actions' },
  parameters: {
    docs: {
      description: {
        component:
          'One tab stop for the whole row: Tab enters, arrow keys move, Tab leaves. A table header in a dense tool can carry ten controls, and ten tab stops between the title and the first row is a keyboard user’s afternoon. Groups are divided by a keyline — space alone between identical ghost buttons reads as uneven spacing, not as grouping.',
      },
    },
  },
} satisfies Meta<typeof Toolbar>

export default meta
type Story = StoryObj<typeof meta>

export const RunActions: Story = {
  render: (args) => (
    <Toolbar {...args} variant="panel">
      <ToolbarGroup>
        <ToolbarButton icon={<Play />}>Re-run</ToolbarButton>
        <ToolbarButton icon={<Square />}>Stop</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ToolbarButton icon={<Copy />}>Copy id</ToolbarButton>
        <ToolbarButton icon={<Link2 />}>Share trace</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton icon={<Trash2 />} variant="ghost" className="text-rojo-deep">
        Delete
      </ToolbarButton>
    </Toolbar>
  ),
}

export const IconOnly: Story = {
  args: { 'aria-label': 'Prompt formatting' },
  render: (args) => (
    <Toolbar {...args} variant="panel">
      <ToolbarGroup>
        <ToolbarButton aria-label="Bold" icon={<Bold />} className="w-(--control-h-sm) px-0" />
        <ToolbarButton aria-label="Italic" icon={<Italic />} className="w-(--control-h-sm) px-0" />
        <ToolbarButton aria-label="Code" icon={<Code />} className="w-(--control-h-sm) px-0" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Align left" icon={<AlignLeft />} className="w-(--control-h-sm) px-0" />
    </Toolbar>
  ),
}
