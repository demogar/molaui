import type { Meta, StoryObj } from '@storybook/react-vite'

import { Divider } from './divider'

const meta = {
  title: 'Components/Layout/Divider',
  component: Divider,
  args: { variant: 'keyline' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['keyline', 'relleno', 'diente'] },
    band: { control: 'inline-radio', options: ['oro', 'rojo', 'anil', 'verde', 'cloth'] },
  },
  decorators: [(Story) => <div className="w-full max-w-xl py-6">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component:
          'Three dividers, in rising order of weight and rarity. **Keyline** between rows. **Relleno** — fine ink slits cut into a field of colour — for a seam between parts of a page. **Diente**, the sawtooth, only where the page gives way to a filled panel: in a real mola it is the slow, expensive cut, so there are only a few. Relleno between every card turns the texture into wallpaper.',
      },
    },
  },
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const Keyline: Story = {}

export const Relleno: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['oro', 'rojo', 'anil', 'verde'] as const).map((band) => (
        <Divider key={band} variant="relleno" band={band} />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The colour is the ground and the ink is the slit. Inverted — thick colour bars on black — the strip reads as hazard tape, which is exactly what the first build of this utility did.',
      },
    },
  },
}

export const Diente: Story = {
  render: () => (
    <div>
      <div className="h-16 bg-cloth-pale" />
      <Divider variant="diente" className="text-ink" />
      <div className="on-ink p-6 text-sm">The page gives way to an ink panel.</div>
      <Divider variant="diente" up className="text-ink" />
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-24 items-stretch gap-6">
      <span className="self-center text-sm">Left</span>
      <Divider orientation="vertical" />
      <span className="self-center text-sm">Middle</span>
      <Divider orientation="vertical" variant="relleno" band="rojo" />
      <span className="self-center text-sm">Right</span>
    </div>
  ),
}
