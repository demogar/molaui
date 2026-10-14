import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, GitBranch, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { Button, IconButton } from '../button'
import { Toolbar, ToolbarButton } from '../toolbar'
import { Tooltip, TooltipProvider } from './tooltip'

const meta = {
  title: 'Components/Overlays/Tooltip',
  tags: ['stable'],
  component: Tooltip,
  args: { content: 'Copy run id', children: <span /> },
  parameters: {
    layout: 'centered',
    docs: {
      // Opens on render, so each story gets its own frame: open overlays
      // inline on the docs page would stack over the text, and a modal one
      // would lock the whole page.
      story: { inline: false, height: '160px' },
      description: {
        component:
          'The inverse panel at its smallest: ink ground, cloth type, no blur. A tooltip is a label, not a place — it should never look like something you can move into and click. The `shortcut` slot exists because, after the name, the most useful thing a tooltip in a tool can say is how to do it without the pointer. Never the only home for information: it does not exist on touch.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tooltip content="Copy run id" defaultOpen>
      <IconButton label="Copy run id" variant="secondary">
        <Copy />
      </IconButton>
    </Tooltip>
  ),
}

export const WithShortcut: Story = {
  render: () => (
    <Tooltip content="Re-run from this step" shortcut={['⌘', '⇧', 'R']} defaultOpen side="bottom">
      <Button variant="secondary" icon={<RotateCcw />}>
        Re-run
      </Button>
    </Tooltip>
  ),
}

export const ToolbarGroup: Story = {
  render: () => (
    <TooltipProvider>
      <Toolbar variant="panel" aria-label="Run controls">
        <Tooltip content="Start" shortcut={['R']}>
          <ToolbarButton aria-label="Start" icon={<Play />} className="w-(--control-h-sm) px-0" />
        </Tooltip>
        <Tooltip content="Pause after this step" shortcut={['P']}>
          <ToolbarButton aria-label="Pause after this step" icon={<Pause />} className="w-(--control-h-sm) px-0" />
        </Tooltip>
        <Tooltip content="Stop run" shortcut={['⌘', '.']}>
          <ToolbarButton aria-label="Stop run" icon={<Square />} className="w-(--control-h-sm) px-0" />
        </Tooltip>
        <Tooltip content="Fork from here">
          <ToolbarButton aria-label="Fork from here" icon={<GitBranch />} className="w-(--control-h-sm) px-0" />
        </Tooltip>
      </Toolbar>
    </TooltipProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Inside a `TooltipProvider`, the delay applies to the first hover only. Sweep the pointer along the toolbar: each next label appears immediately, with no animation, so it never lags the pointer. The row is a `Toolbar` of `ToolbarButton`s, not a `div` of buttons: one tab stop, and the arrow keys move between the controls, showing each label as focus arrives.',
      },
    },
  },
}
