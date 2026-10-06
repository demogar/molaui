import type { Meta, StoryObj } from '@storybook/react-vite'

import { Checkbox, CheckboxGroup } from '../checkbox/checkbox'
import { Radio, RadioGroup } from './radio'

const meta = {
  title: 'Components/Forms/Radio',
  component: RadioGroup,
  args: { label: 'When a tool call fails' },
  parameters: {
    docs: {
      description: {
        component:
          '**Square, on purpose.** What tells a person “one of these” is the grouping, the legend and the behaviour — arrows move the choice, Tab leaves the group — not the circle; and a circle would be the only curve in a system cut with a blade. So a radio differs from a checkbox by its *mark*: a checkbox fills and has a check cut out of it, a radio keeps its cloth and has a smaller solid square set inside. Semantics are unchanged: Base UI renders `role="radio"` in a named `radiogroup`.',
      },
    },
  },
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args} defaultValue="retry">
      <Radio value="retry" label="Retry, then continue" description="Up to three attempts." />
      <Radio value="skip" label="Skip the step" />
      <Radio value="halt" label="Halt the run" description="The run is marked failed and the owner is paged." />
      <Radio value="ask" label="Ask a human" disabled description="Needs an on-call rota." />
    </RadioGroup>
  ),
}

export const Horizontal: Story = {
  args: { label: 'Visibility' },
  render: (args) => (
    <RadioGroup {...args} orientation="horizontal" defaultValue="team">
      <Radio value="private" label="Only me" />
      <Radio value="team" label="Team" />
      <Radio value="org" label="Everyone" />
    </RadioGroup>
  ),
}

export const BesideACheckbox: Story = {
  name: 'Beside a checkbox',
  render: () => (
    <div className="flex flex-wrap gap-10">
      <RadioGroup label="Radio — one of" defaultValue="a">
        <Radio value="a" label="Selected" />
        <Radio value="b" label="Not selected" />
      </RadioGroup>
      <CheckboxGroup legend="Checkbox — any of" defaultValue={['a']}>
        <Checkbox value="a" label="Checked" />
        <Checkbox value="b" label="Not checked" />
      </CheckboxGroup>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The test that matters for a square radio: side by side at 16px, the two are told apart by the mark — a check cut out of a filled square, against a solid square set inside cloth.',
      },
    },
  },
}
