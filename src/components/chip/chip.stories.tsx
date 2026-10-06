import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'

import { Chip, ChipGroup } from './chip'

const meta = {
  title: 'Components/Forms/Chip',
  component: Chip,
  args: { children: 'Failed' },
  parameters: {
    docs: {
      description: {
        component:
          'A filter whose state you can see. A real `<input>` sits inside the styled `<label>`, so the keyboard, radio arrow keys and form submission come from the platform. Checked fills with ink — the cut — and hovering an unchecked chip reveals the band beneath it: the same gesture, stopped halfway.',
      },
    },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const StatusFilters: Story = {
  render: () => (
    <ChipGroup legend="Status">
      <Chip defaultChecked count={1284}>
        <CircleCheck aria-hidden /> Succeeded
      </Chip>
      <Chip count={37}>
        <LoaderCircle aria-hidden /> Running
      </Chip>
      <Chip defaultChecked count={12}>
        <CircleAlert aria-hidden /> Failed
      </Chip>
      <Chip disabled count={0}>
        Cancelled
      </Chip>
    </ChipGroup>
  ),
}

export const SingleChoice: Story = {
  render: () => (
    <ChipGroup legend="Time range">
      {['1h', '24h', '7d', '30d'].map((range) => (
        <Chip key={range} type="radio" name="range" value={range} defaultChecked={range === '24h'}>
          {range}
        </Chip>
      ))}
    </ChipGroup>
  ),
}

export const Comfortable: Story = {
  render: () => (
    <ChipGroup legend="Audience" className="max-w-md">
      <Chip size="comfortable" defaultChecked>
        New players in their first week
      </Chip>
      <Chip size="comfortable">Returning after 30 days away</Chip>
    </ChipGroup>
  ),
}
