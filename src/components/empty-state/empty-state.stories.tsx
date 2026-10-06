import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus, RotateCcw } from 'lucide-react'

import { Button } from '../button'
import { EmptyState } from './empty-state'

const meta = {
  title: 'Components/Feedback/Empty state',
  component: EmptyState,
  args: {
    title: 'No experiments yet',
    description: 'An experiment ships a change to a slice of players and measures what it does.',
    actions: <Button icon={<Plus />}>New experiment</Button>,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['empty', 'no-results', 'error', 'no-permission'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A condition, not an apology. The panel is packed with **relleno** — what a mola does with an area that has nothing in it yet — and the words sit on a raised plate above it. Four variants, because they are four different conversations: an empty filter result must never tell someone to “create your first experiment”.',
      },
    },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const NoResults: Story = {
  args: {
    variant: 'no-results',
    title: 'No runs match these filters',
    description: '3 filters are hiding 1,284 runs.',
    actions: <Button variant="secondary">Clear filters</Button>,
  },
}

export const LoadError: Story = {
  args: {
    variant: 'error',
    title: 'Traces did not load',
    description: 'The trace store returned 503. Nothing was lost; this panel will try again on its own in 30s.',
    actions: (
      <Button variant="secondary" icon={<RotateCcw />}>
        Retry now
      </Button>
    ),
  },
}

export const NoPermission: Story = {
  args: {
    variant: 'no-permission',
    title: 'Billing is restricted',
    description: 'Workspace owners can see cost data. Ask Priya or Tomás for access.',
    actions: <Button variant="secondary">Request access</Button>,
  },
}

export const Small: Story = {
  args: { size: 'sm', title: 'No tool calls in this step', description: undefined, actions: undefined, icon: false },
}
