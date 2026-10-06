import type { Meta, StoryObj } from '@storybook/react-vite'

import { Heading } from '../typography/heading'
import { Rotulo } from '../typography/rotulo'
import { Text } from '../typography/text'
import { Panel, type PanelTone } from './panel'

const TONES: PanelTone[] = ['pale', 'cloth', 'shade', 'ink', 'rojo', 'anil', 'verde', 'oro']

const meta = {
  title: 'Components/Layout/Panel',
  component: Panel,
  args: { tone: 'pale', edge: 'cut', padding: 'md' },
  argTypes: {
    tone: { control: 'select', options: TONES },
    edge: { control: 'inline-radio', options: ['cut', 'band', 'none'] },
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] },
    band: { control: 'inline-radio', options: ['oro', 'rojo', 'anil', 'verde', 'cloth'] },
  },
  render: (args) => (
    <Panel {...args} className="max-w-sm">
      <Heading level={3}>Weekly digest agent</Heading>
      <Text size="sm" tone={2} className="mt-2">
        Summarises the week’s experiment results for the growth channel every Monday.
      </Text>
      <Text size="xs" tone="muted" className="mt-3">
        Last run 2 h ago · 14 tool calls
      </Text>
    </Panel>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'The cut surface. **Tone is a ground, and the ground decides the ink**: a layer panel redefines the whole ink ramp, because a child’s own `text-ink-muted` beats an inherited colour and would render dark-on-dark. On rojo, añil and verde only one ink clears 4.5:1, so on a layer panel hierarchy is size and weight, not lightness. Colour owns regions — it never tints the reading column.',
      },
    },
  },
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Grounds: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
      {TONES.map((tone) => (
        <Panel key={tone} tone={tone}>
          <Heading level={3}>{tone}</Heading>
          <Text size="sm" tone={2} className="mt-1">
            Secondary ink on this ground.
          </Text>
          <Text size="xs" tone="muted" className="mt-1">
            Muted ink on this ground.
          </Text>
          <Rotulo
            className="mt-4"
            band={tone === 'ink' ? 'oro' : ['pale', 'cloth', 'shade'].includes(tone) ? 'rojo' : 'cloth'}
            plain={tone === 'oro'}
          >
            Label
          </Rotulo>
        </Panel>
      ))}
    </div>
  ),
}

export const TheOnePanel: Story = {
  args: { edge: 'band', band: 'oro' },
  parameters: {
    docs: {
      description: {
        story: '`edge="band"` — keyline, revealed band, keyline. The signature, for the one panel on a screen that is the point of the screen.',
      },
    },
  },
}
