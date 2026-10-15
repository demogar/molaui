import type { Meta, StoryObj } from '@storybook/react-vite'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { Switch } from './switch'

const meta = {
  title: 'Components/Forms/Switch',
  tags: ['stable'],
  component: Switch,
  args: { label: 'Stream responses', defaultChecked: true },
  parameters: {
    docs: {
      description: {
        component:
          'For settings that take effect **immediately**; a choice that waits for Save is a checkbox. “On” is **verde**, not ink: ink already means *selected* everywhere in the system, and a switch is not a selection but the state of something running — verde is the layer reserved for *live*. Colour is never the only signal: the square travels end to end.',
      },
    },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const States: Story = {
  render: () => (
    <div className="grid gap-4">
      <Switch label="Off" />
      <Switch label="On" defaultChecked />
      <Switch label="Disabled" disabled />
      <Switch label="Disabled, on" disabled defaultChecked />
    </div>
  ),
}

export const SettingsList: Story = {
  render: () => (
    <div className="max-w-md divide-y divide-keyline bg-cloth-pale shadow-cut">
      {[
        ['Stream responses', 'Tokens appear as they are generated.', true],
        ['Allow web search', 'The agent may call search_web.', false],
        ['Log tool arguments', 'Stored for 30 days; may contain user text.', true],
      ].map(([label, description, on]) => (
        <div key={String(label)} className="px-4 py-3.5">
          <Switch
            label={label as string}
            description={description as string}
            defaultChecked={on as boolean}
            labelPosition="start"
            wrapperClassName="grid w-full"
          />
        </div>
      ))}
    </div>
  ),
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Switch
          label="Log every tool argument, including free text the customer typed into the conversation"
          description="Stored for 30 days and visible to anyone with access to the run."
          labelPosition="start"
          wrapperClassName="grid w-full"
        />
      </HardState>
      <HardState state="rtl">
        <div className="grid gap-4">
          <Switch label="بث الردود" defaultChecked />
          <Switch label="السماح بالبحث في الويب" />
        </div>
      </HardState>
      <HardState state="disabled">
        <div className="grid gap-4">
          <Switch label="Allow web search" disabled description="Turned off for this workspace by an admin." />
          <Switch label="Stream responses" disabled defaultChecked />
        </div>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long label wraps and the switch keeps its size at the end of the row. In right to left the thumb travels the other way: on is at the left. A disabled switch keeps its keyline and its position, and says why. There is no error cell: a switch takes effect the moment it is pressed, so there is nothing to submit and nothing to validate.',
      },
    },
  },
}
