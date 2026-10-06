import type { Meta, StoryObj } from '@storybook/react-vite'

import { Heading } from './heading'

const meta = {
  title: 'Components/Typography/Heading',
  component: Heading,
  args: { level: 2, children: 'Experiment results' },
  argTypes: {
    level: { control: 'inline-radio', options: [1, 2, 3, 4] },
    size: { control: 'inline-radio', options: [undefined, 1, 2, 3, 4] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Four levels. The scale is steep at the top and flat at the bottom: in a dense tool a group label cannot spend 20px, so level 4 is distinguished by weight and width rather than size. `size` decouples the look from the outline — never skip a level to get a smaller heading.',
      },
    },
  },
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <Heading level={1}>Knowledge agents</Heading>
      <Heading level={2}>Run history</Heading>
      <Heading level={3}>Tool calls in this step</Heading>
      <Heading level={4}>Arguments</Heading>
    </div>
  ),
}
