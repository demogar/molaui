import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, GitBranch, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { Button, IconButton } from '../button'
import { Toolbar, ToolbarButton } from '../toolbar'
import { Tooltip, TooltipProvider } from './tooltip'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { DirectionProvider } from '../../lib/direction'

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

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label" className="min-h-32">
        <Tooltip content="Re-run from the last step that succeeded, keeping every tool result from before it" defaultOpen side="bottom">
          <Button variant="secondary" size="sm" icon={<RotateCcw />}>
            Re-run
          </Button>
        </Tooltip>
      </HardState>
      <HardState state="rtl" className="min-h-32">
        <DirectionProvider direction="rtl">
          <Tooltip content="نسخ معرّف التشغيل" shortcut={['⌘', 'C']} defaultOpen side="bottom" dir="rtl" lang="ar">
            <IconButton label="نسخ معرّف التشغيل" variant="secondary">
              <Copy />
            </IconButton>
          </Tooltip>
        </DirectionProvider>
      </HardState>
      <HardState state="disabled" className="min-h-32">
        <Tooltip content="Stop is available while the run is going" defaultOpen side="bottom">
          <Button variant="secondary" size="sm" icon={<Square />} disabled focusableWhenDisabled>
            Stop
          </Button>
        </Tooltip>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      story: { inline: false, height: '360px' },
      description: {
        story:
          'A long label wraps at the tooltip’s maximum width rather than running across the page; in right to left the label and its shortcut keys swap sides; a disabled control stays focusable (`focusableWhenDisabled`) so its tooltip can say why it is disabled, the one place a tooltip carries a reason. A tooltip has no error state: it is a label, and an error is never left to something that does not exist on touch.',
      },
    },
  },
}
