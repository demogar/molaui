import type { Meta, StoryObj } from '@storybook/react-vite'

import { Placeholder } from './placeholder'

const meta = {
  title: 'Components/Feedback/Placeholder',
  component: Placeholder,
  args: { label: 'Chart', name: 'Retention by cohort', alt: 'No data yet: retention by cohort', className: 'h-56 w-full max-w-96' },
  argTypes: { tone: { control: 'inline-radio', options: ['default', 'deep'] } },
  parameters: {
    docs: {
      description: {
        component:
          'The slot where something will go and has not yet — designed as a condition, not an apology. A blank grey box reads as a failure to load; a cut panel filled with relleno reads as a slot cut and waiting, which is what relleno is for in a real mola. Born as the photo placeholder of Must Do Panama.',
      },
    },
  },
} satisfies Meta<typeof Placeholder>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Deep: Story = { args: { tone: 'deep', label: 'Photography', name: 'Panama Canal', alt: 'No photograph yet for the Panama Canal' } }
