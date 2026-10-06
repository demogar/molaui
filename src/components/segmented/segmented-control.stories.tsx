import type { Meta, StoryObj } from '@storybook/react-vite'
import { Columns3, LayoutList, Table2 } from 'lucide-react'
import { useState } from 'react'

import { SegmentedControl } from './segmented-control'

const meta = {
  title: 'Components/Forms/Segmented control',
  component: SegmentedControl,
  args: {
    'aria-label': 'View',
    options: [
      { value: 'table', label: 'Table' },
      { value: 'board', label: 'Board' },
      { value: 'timeline', label: 'Timeline' },
    ],
    defaultValue: 'table',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Cut from **one piece**: a single keyline round the whole control, segments divided by ink slits, so the seams never double and it reads as one control with several positions rather than a toolbar of separate actions. The chosen segment fills with ink. Pressing the active segment does nothing — a view switcher with no view is not a state the screen can render.',
      },
    },
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithIcons: Story = {
  args: {
    options: [
      { value: 'table', label: 'Table', icon: <Table2 /> },
      { value: 'board', label: 'Board', icon: <Columns3 /> },
      { value: 'list', label: 'List', icon: <LayoutList /> },
    ],
  },
}

export const IconOnly: Story = {
  args: {
    iconOnly: true,
    size: 'sm',
    options: [
      { value: 'table', label: 'Table', icon: <Table2 /> },
      { value: 'board', label: 'Board', icon: <Columns3 /> },
      { value: 'list', label: 'List', icon: <LayoutList /> },
    ],
  },
}

function DensityDemo() {
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')
  return (
    <div className="grid max-w-md grid-cols-1 gap-4">
      <SegmentedControl
        aria-label="Density"
        fill
        value={density}
        onValueChange={setDensity}
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'spacious', label: 'Spacious' },
        ]}
      />
      <div data-density={density} className="bg-cloth-pale p-4 shadow-cut">
        <p className="m-0 text-base">This panel is set to {density}.</p>
        <p className="m-0 text-sm text-ink-muted">Type, spacing and control heights follow it.</p>
      </div>
    </div>
  )
}

export const Controlled: Story = {
  name: 'Controlling density',
  render: () => <DensityDemo />,
}

export const Disabled: Story = {
  args: {
    options: [
      { value: 'table', label: 'Table' },
      { value: 'board', label: 'Board', disabled: true },
      { value: 'timeline', label: 'Timeline' },
    ],
  },
}
