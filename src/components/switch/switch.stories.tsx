import type { Meta, StoryObj } from '@storybook/react-vite'

import { Switch } from './switch'

const meta = {
  title: 'Components/Forms/Switch',
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
            className="grid w-full"
          />
        </div>
      ))}
    </div>
  ),
}
