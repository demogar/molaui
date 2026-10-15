import type { Meta, StoryObj } from '@storybook/react-vite'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { RunStatusGlyph } from '../ai/run-status'
import { Chip, ChipGroup } from './chip'

const meta = {
  title: 'Components/Forms/Chip',
  tags: ['stable'],
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
        <RunStatusGlyph status="succeeded" /> Succeeded
      </Chip>
      <Chip count={37}>
        <RunStatusGlyph status="running" /> Running
      </Chip>
      <Chip defaultChecked count={12}>
        <RunStatusGlyph status="failed" /> Failed
      </Chip>
      <Chip disabled count={0}>
        <RunStatusGlyph status="cancelled" /> Cancelled
      </Chip>
    </ChipGroup>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A status filter wears the same glyph as the status it filters: `RunStatusGlyph`, so "Running" is the relleno working state that `RunStatus` shows in the table below it, not a spinner icon.',
      },
    },
  },
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
      <Chip size="md" defaultChecked>
        New workspaces in their first week
      </Chip>
      <Chip size="md">Returning after 30 days away</Chip>
    </ChipGroup>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <ChipGroup legend="Audience">
          <Chip size="md" defaultChecked>
            Workspaces that ran more than one hundred evaluations in their first week
          </Chip>
          <Chip size="md">Returning after thirty days away with an expired key</Chip>
        </ChipGroup>
      </HardState>
      <HardState state="rtl">
        <ChipGroup legend="الحالة">
          <Chip defaultChecked count={1284}>
            <RunStatusGlyph status="succeeded" /> ناجح
          </Chip>
          <Chip count={37}>
            <RunStatusGlyph status="running" /> قيد التشغيل
          </Chip>
          <Chip count={12}>
            <RunStatusGlyph status="failed" /> فاشل
          </Chip>
        </ChipGroup>
      </HardState>
      <HardState state="disabled">
        <ChipGroup legend="Status">
          <Chip disabled count={0}>
            <RunStatusGlyph status="cancelled" /> Cancelled
          </Chip>
          <Chip disabled defaultChecked count={4}>
            <RunStatusGlyph status="succeeded" /> Archived
          </Chip>
        </ChipGroup>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A sentence-length filter takes `size="md"` and wraps; the one-line `sm` chip never does. In right to left the glyph leads from the right and the count trails at the left. A disabled chip keeps its keyline and, if checked, its fill. There is no error cell: a chip filters a view and is never submitted, so there is nothing for it to fail.',
      },
    },
  },
}
