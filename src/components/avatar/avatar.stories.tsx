import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bot } from 'lucide-react'

import { Avatar, AvatarGroup } from './avatar'

const meta = {
  title: 'Components/Data display/Avatar',
  component: Avatar,
  args: { name: 'Ana Pérez', size: 'lg' },
  parameters: {
    docs: {
      description: {
        component:
          'A square of cut cloth. The ground is one of the five layers, picked from the name by a stable hash — the same person is the same colour on every screen without anyone storing a colour — and every pairing is one tokens.css already measured. An image replaces the initials only once it has actually loaded.',
      },
    },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

const PEOPLE = ['Ana Pérez', 'Kofi Mensah', 'Yuki Tanaka', 'Luis Batista', 'Mira Castillo', 'Omar Haddad', 'Grace Lee']

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Avatar key={size} name="Kofi Mensah" size={size} />
      ))}
    </div>
  ),
}

export const Layers: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {PEOPLE.map((name) => (
        <Avatar key={name} name={name} size="lg" />
      ))}
    </div>
  ),
}

export const Agent: Story = {
  args: { name: 'Docs answerer', icon: <Bot /> },
  parameters: {
    docs: { description: { story: 'An agent gets a glyph instead of initials, so a person and a bot are never confused in an activity log.' } },
  },
}

export const BrokenImage: Story = {
  args: { name: 'Luis Batista', src: 'https://invalid.example/nope.png' },
  parameters: {
    docs: { description: { story: 'The URL fails; the initials stay. No broken-image glyph inside a keyline.' } },
  },
}

export const Group: Story = {
  render: () => (
    <AvatarGroup label="Reviewers" max={4}>
      {PEOPLE.map((name) => (
        <Avatar key={name} name={name} />
      ))}
    </AvatarGroup>
  ),
}
