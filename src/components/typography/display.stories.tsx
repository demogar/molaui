import type { Meta, StoryObj } from '@storybook/react-vite'

import { Display } from './display'

const meta = {
  title: 'Components/Typography/Display',
  component: Display,
  args: { children: 'Not everything. Just what matters.' },
  parameters: {
    docs: {
      description: {
        component:
          'Archivo Bold at `wdth` 118. A heading here is a shape cut to fill its panel; the width, not a colour, is what keeps it out of the generic tight-grotesque register. One per screen at most — page titles in a working view are `Heading level={1}`.',
      },
    },
  },
} satisfies Meta<typeof Display>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OnInkPanelWithCut: Story = {
  render: (args) => (
    <div className="on-ink p-10">
      <Display {...args} className="display-cut band-oro text-on-oro">
        Agents, cut to size.
      </Display>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '`display-cut` — the signature. Shape, revealed gold band, ink edge: the layer order of a real mola. The fill is `on-oro`, because it is read against the band, not the panel (9.34:1 light, 9.19:1 dark). Allowed on filled panels only; on light cloth it reads as a comic-book sticker, not appliqué. One per page.',
      },
    },
  },
}
