import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Checkbox, CheckboxGroup } from './checkbox'

const meta = {
  title: 'Components/Forms/Checkbox',
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
