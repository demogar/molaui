import type { Meta, StoryObj } from '@storybook/react-vite'

import { Lead } from './lead'

const meta = {
  title: 'Components/Typography/Lead',
  component: Lead,
  args: {
    children:
      'Agents answer questions from the knowledge base and can call tools on your behalf. Every run is recorded, so you can see exactly what was retrieved, what was called and what it cost.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'The one place a tool speaks in prose: the paragraph under a page title that explains what this screen is for. Alegreya — the reading voice — because it is read once, properly, not scanned.',
      },
    },
  },
} satisfies Meta<typeof Lead>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
