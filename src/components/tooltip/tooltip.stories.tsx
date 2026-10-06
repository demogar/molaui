import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, GitBranch, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { Button, IconButton } from '../button'
import { Tooltip, TooltipProvider } from './tooltip'

const meta = {
  title: 'Components/Overlays/Tooltip',
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
      <div className="flex gap-1 bg-cloth-pale p-1 shadow-cut" role="toolbar" aria-label="Run controls">
        <Tooltip content="Start" shortcut={['R']}>
          <IconButton label="Start" variant="ghost" size="sm">
            <Play />
          </IconButton>
        </Tooltip>
        <Tooltip content="Pause after this step" shortcut={['P']}>
          <IconButton label="Pause after this step" variant="ghost" size="sm">
            <Pause />
          </IconButton>
        </Tooltip>
        <Tooltip content="Stop run" shortcut={['⌘', '.']}>
          <IconButton label="Stop run" variant="ghost" size="sm">
            <Square />
          </IconButton>
        </Tooltip>
        <Tooltip content="Fork from here">
          <IconButton label="Fork from here" variant="ghost" size="sm">
            <GitBranch />
          </IconButton>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Inside a `TooltipProvider`, the delay applies to the first hover only. Sweep the pointer along the toolbar: each next label appears immediately, with no animation, so it never lags the pointer.',
      },
    },
  },
}
