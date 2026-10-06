import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Play, Plus, Square, Trash2 } from 'lucide-react'
import { fn } from 'storybook/test'

import { Button, IconButton } from './button'

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  args: { children: 'Run agent', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A cut shape. Hover reveals the band of the layer beneath — the edge grows outward as a `box-shadow`, so nothing around it moves. **Primary is ink, not red**: in a tool with a primary action in every panel, red has to keep meaning *this destroys something*.',
      },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Run agent
      </Button>
      <Button {...args} variant="secondary">
        Duplicate
      </Button>
      <Button {...args} variant="danger">
        Delete run
      </Button>
      <Button {...args} variant="ghost">
        Cancel
      </Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Sizes read their height from the density tokens. Switch **Density** in the toolbar: the same `md` button is 28px in a compact table toolbar and 48px in a spacious form.',
      },
    },
  },
}

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} icon={<Play />}>
        Start run
      </Button>
      <Button {...args} variant="secondary" icon={<Plus />}>
        New rollout
      </Button>
      <Button {...args} variant="secondary" withArrow>
        Open trace
      </Button>
      <Button {...args} variant="danger" icon={<Trash2 />}>
        Delete
      </Button>
    </div>
  ),
}

export const Loading: Story = {
  args: { loading: true, children: 'Deploying' },
  parameters: {
    docs: {
      description: {
        story:
          'The label stays, so the button never changes width mid-click. A strip of *working relleno* — the system’s indeterminate texture — runs along its foot. The button remains focusable and is announced as busy.',
      },
    },
  },
}

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} disabled>
        Primary
      </Button>
      <Button {...args} variant="secondary" disabled>
        Secondary
      </Button>
      <Button {...args} variant="ghost" disabled>
        Ghost
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Stated, not faded. `opacity-50` would fade the keyline too and drop the label near 2:1 — a failure axe never reports, because disabled controls are exempt from contrast.',
      },
    },
  },
}

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton label="Copy run id" variant="secondary" size="sm">
        <Copy />
      </IconButton>
      <IconButton label="Start" variant="primary">
        <Play />
      </IconButton>
      <IconButton label="Stop run" variant="danger">
        <Square />
      </IconButton>
      <IconButton label="Delete" variant="ghost" size="lg">
        <Trash2 />
      </IconButton>
    </div>
  ),
}

export const OnInkPanel: Story = {
  render: (args) => (
    <div className="on-ink flex flex-wrap items-center gap-3 p-6">
      <Button {...args} variant="secondary">
        Secondary on ink
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
    </div>
  ),
}
