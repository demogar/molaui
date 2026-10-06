import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlignLeft, Archive, Bold, Code, Copy, Download, Italic, Link2, Play, RefreshCw, Share2, Square, Tag, Trash2, WrapText } from 'lucide-react'
import * as React from 'react'

import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarOverflow,
  ToolbarSeparator,
  ToolbarToggle,
  ToolbarToggleGroup,
} from './toolbar'

const meta = {
  title: 'Components/Layout/Toolbar',
  component: Toolbar,
  args: { 'aria-label': 'Run actions' },
  parameters: {
    docs: {
      description: {
        component:
          'One tab stop for the whole row: Tab enters, arrow keys move, Tab leaves. A table header in a dense tool can carry ten controls, and ten tab stops between the title and the first row is a keyboard user’s afternoon. Groups are divided by a keyline — space alone between identical ghost buttons reads as uneven spacing, not as grouping.\n\n**Toggles** are pressed by the ink fill, the same cut the checked chip and the current page make, with `aria-pressed` from Base UI. A `ToolbarToggleGroup` joins the toolbar’s roving focus rather than adding a second arrow-key scope. **`ToolbarInput`** is a stop too: the arrows move the caret and only leave the field at its edges. **`ToolbarOverflow`** folds actions into a “More” menu when the row runs out of room. Folded items are unmounted, not hidden — a `display: none` button would still be a stop the arrows stall on — and widths come from a measuring copy, so the fold follows real label widths in the current density. In right-to-left the arrow keys mirror (switch **Direction**).',
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

export const Toggles: Story = {
  args: { 'aria-label': 'Trace view' },
  render: (args) => {
    const [wrap, setWrap] = React.useState(true)
    return (
      <Toolbar {...args} variant="panel" className="w-fit">
        <ToolbarToggleGroup aria-label="Show steps" multiple defaultValue={['tool', 'message']}>
          <ToolbarToggle value="reasoning">Reasoning</ToolbarToggle>
          <ToolbarToggle value="tool">Tool calls</ToolbarToggle>
          <ToolbarToggle value="message">Messages</ToolbarToggle>
        </ToolbarToggleGroup>
        <ToolbarSeparator />
        <ToolbarToggle icon={<WrapText />} pressed={wrap} onPressedChange={setWrap}>
          Wrap lines
        </ToolbarToggle>
      </Toolbar>
    )
  },
}

const bulk = [
  { key: 'rerun', label: 'Re-run', icon: <Play />, onSelect: () => {} },
  { key: 'label', label: 'Add label', icon: <Tag />, onSelect: () => {} },
  { key: 'export', label: 'Export', icon: <Download />, onSelect: () => {} },
  { key: 'share', label: 'Share', icon: <Share2 />, onSelect: () => {} },
  { key: 'archive', label: 'Archive', icon: <Archive />, onSelect: () => {} },
  { key: 'delete', label: 'Delete', icon: <Trash2 />, onSelect: () => {}, tone: 'danger' as const },
]

export const FilterBar: Story = {
  args: { 'aria-label': 'Filter runs' },
  parameters: {
    docs: {
      description: {
        story:
          'The bar above a table: a search field, a one-of status set and refresh. The field takes the remaining width; the toolbar is still one tab stop, and the arrows leave the field only from its edges.',
      },
    },
  },
  render: (args) => (
    <Toolbar {...args} variant="panel" className="max-w-3xl flex-nowrap">
      <ToolbarInput aria-label="Search runs" placeholder="Search runs" type="search" wrapperClassName="flex-1 min-w-32" />
      <ToolbarSeparator />
      <ToolbarToggleGroup aria-label="Status" defaultValue={['all']}>
        <ToolbarToggle value="all">All</ToolbarToggle>
        <ToolbarToggle value="failed">Failed</ToolbarToggle>
        <ToolbarToggle value="running">Running</ToolbarToggle>
      </ToolbarToggleGroup>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Refresh" icon={<RefreshCw />} className="w-(--control-h-sm) px-0" />
    </Toolbar>
  ),
}

export const Overflow: Story = {
  args: { 'aria-label': 'Bulk actions' },
  parameters: {
    docs: {
      description: {
        story:
          'The same six actions at three widths. Items fold from the end, so the most used stay in the row longest; Delete is last, and highlights in rojo once it lands in the menu.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-col gap-4">
      {['max-w-2xl', 'max-w-md', 'max-w-64'].map((width) => (
        <Toolbar key={width} {...args} variant="panel" className={`${width} flex-nowrap`}>
          <span className="shrink-0 px-2 text-sm font-semibold tabular-nums text-ink">3 selected</span>
          <ToolbarSeparator />
          <ToolbarOverflow items={bulk} align="start" />
        </Toolbar>
      ))}
    </div>
  ),
}
