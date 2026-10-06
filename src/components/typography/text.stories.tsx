import type { Meta, StoryObj } from '@storybook/react-vite'

import { Text } from './text'

const meta = {
  title: 'Components/Typography/Text',
  component: Text,
  args: { children: 'The agent retrieved 14 documents and cited 3 of them.' },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm', 'base', 'lg'] },
    tone: { control: 'inline-radio', options: ['default', 2, 'muted', 'danger', 'success'] },
    weight: { control: 'inline-radio', options: ['regular', 'medium', 'semibold'] },
    as: { control: 'inline-radio', options: ['p', 'span', 'div'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Running UI text. Three inks and no more — ink for what the reader came for, ink-2 for what explains it, muted for what they can skip. A fourth grey would be one nobody can tell from its neighbours.',
      },
    },
  },
} satisfies Meta<typeof Text>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Inks: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-2">
      <Text>Ink — the thing the reader came for.</Text>
      <Text tone={2}>Ink-2 — what explains it. 8.80:1 on cloth.</Text>
      <Text tone="muted">Muted — what they can skip. 5.19:1, and the floor.</Text>
      <Text tone="danger">Danger ink — a failure, said in words.</Text>
      <Text tone="success">Success ink — a pass, said in words.</Text>
    </div>
  ),
}

export const Tabular: Story = {
  render: () => (
    <div className="flex flex-col items-end">
      {['1,204.50', '87.10', '12,990.00'].map((n) => (
        <Text key={n} tabular>
          {n} ms
        </Text>
      ))}
    </div>
  ),
  parameters: {
    docs: { description: { story: 'Figures that are compared down a column are tabular. No monospace needed.' } },
  },
}
