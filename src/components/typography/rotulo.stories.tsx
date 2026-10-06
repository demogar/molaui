import type { Meta, StoryObj } from '@storybook/react-vite'

import { Heading } from './heading'
import { Lead } from './lead'
import { Rotulo } from './rotulo'

const meta = {
  title: 'Components/Typography/Rotulo',
  component: Rotulo,
  args: { children: 'Support platform', band: 'rojo' },
  argTypes: { band: { control: 'inline-radio', options: ['rojo', 'anil', 'verde', 'oro', 'cloth'] } },
  parameters: {
    docs: {
      description: {
        component:
          'The label register: Archivo at `wdth` 116, in caps, cut short by a band of the layer beneath. It replaces the eyebrow, and it goes **under** the block it belongs to — read as attribution, not as a pre-announcement of what the heading is about to say better.',
      },
    },
  },
} satisfies Meta<typeof Rotulo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const UnderABlock: Story = {
  render: () => (
    <div className="max-w-xl">
      <Heading level={2}>Ship rollouts without a deploy</Heading>
      <Lead className="mt-3">Targeting, variants and holdouts, configured where the people who own them work.</Lead>
      <Rotulo className="mt-5">Support platform</Rotulo>
    </div>
  ),
}

export const Bands: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Rotulo band="rojo">Rojo — the default on cloth</Rotulo>
      <Rotulo band="anil">Añil</Rotulo>
      <Rotulo band="verde">Verde</Rotulo>
      <div className="on-ink p-4">
        <Rotulo band="oro">Oro — for ink grounds only</Rotulo>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Gold measures 1.66:1 on light cloth and the mark disappears, so gold bands are for ink panels.' },
    },
  },
}
