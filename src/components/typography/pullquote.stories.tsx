import type { Meta, StoryObj } from '@storybook/react-vite'

import { Pullquote } from './pullquote'

const meta = {
  title: 'Components/Typography/Pullquote',
  component: Pullquote,
  args: {
    children: 'I stopped writing SQL for every campaign question. I ask, it shows its work, I check the query.',
    cite: 'Lifecycle marketing, research interview 7',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A voice interrupting the prose. It keeps the reading face and takes a relleno band above it instead of a hairline: the filler slit is this system’s divider, and a pull quote is the seam it was made for.',
      },
    },
  },
} satisfies Meta<typeof Pullquote>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
