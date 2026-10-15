import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { Checkbox, CheckboxGroup } from './checkbox'

const meta = {
  title: 'Components/Forms/Checkbox',
  tags: ['stable'],
  component: Checkbox,
  args: { label: 'Stream partial output', defaultChecked: true },
  parameters: {
    docs: {
      description: {
        component:
          'A square cut from the cloth. Checked, it fills with ink and the mark is cut out of it — the same inversion as a selected chip or segment, so “on” looks the same everywhere. Indeterminate is a bar, not a faded tick: “some” is a third state, not a rendering glitch.',
      },
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const States: Story = {
  render: () => (
    <div className="grid gap-4">
      <Checkbox label="Unchecked" />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" indeterminate />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled, checked" disabled defaultChecked />
      <Checkbox
        label="Retry failed tool calls"
        description="Up to three times, with exponential backoff."
        defaultChecked
      />
    </div>
  ),
}

const TOOLS = ['search_tickets', 'fetch_ticket', 'lookup_account', 'write_report'] as const

function ParentDemo() {
  const [value, setValue] = useState<string[]>(['search_tickets', 'fetch_ticket'])
  return (
    <CheckboxGroup legend="Tools" value={value} onValueChange={setValue} allValues={[...TOOLS]}>
      <Checkbox parent label="All tools" />
      <div className="flex flex-col gap-3 ps-6">
        {TOOLS.map((tool) => (
          <Checkbox key={tool} value={tool} label={<span className="literal">{tool}</span>} />
        ))}
      </div>
    </CheckboxGroup>
  )
}

export const Group: Story = {
  render: () => <ParentDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'A real `<fieldset>` and `<legend>`: a screen reader says “Tools, group” before the first option. The parent checkbox goes indeterminate when only some children are on.',
      },
    },
  },
}

export const Horizontal: Story = {
  render: () => (
    <CheckboxGroup legend="Notify on" orientation="horizontal" defaultValue={['failure']}>
      <Checkbox value="start" label="Start" />
      <Checkbox value="success" label="Success" />
      <Checkbox value="failure" label="Failure" />
    </CheckboxGroup>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Checkbox
          label="Retry every failed tool call before marking the run as failed and paging the on-call owner"
          description="Up to three attempts per call, with exponential backoff between them, capped at the run’s step budget."
          defaultChecked
        />
      </HardState>
      <HardState state="rtl">
        <CheckboxGroup legend="الأدوات" defaultValue={['search']}>
          <Checkbox value="search" label="البحث في المستندات" />
          <Checkbox value="retry" label="إعادة محاولة الاستدعاءات الفاشلة" description="حتى ثلاث محاولات." />
        </CheckboxGroup>
      </HardState>
      <HardState state="disabled">
        <div className="grid gap-3">
          <Checkbox label="Log tool arguments" disabled />
          <Checkbox label="Stream partial output" disabled defaultChecked />
        </div>
      </HardState>
      <HardState state="error">
        <CheckboxGroup legend="Notify on" error="Choose at least one event to be notified about.">
          <Checkbox value="start" label="Start" />
          <Checkbox value="failure" label="Failure" />
        </CheckboxGroup>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long label wraps beside the box, which stays on the first line rather than centring on the paragraph. In right to left the box moves to the start, at the right. Disabled keeps its keyline and its check. A checkbox fails as part of a group: the error sits under the legend, where a tall group cannot push it out of view.',
      },
    },
  },
}
