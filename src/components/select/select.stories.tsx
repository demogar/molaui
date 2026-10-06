import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '../field/field'
import { Select, type SelectOptionGroup } from './select'

const models: SelectOptionGroup[] = [
  {
    label: 'Anthropic',
    items: [
      { value: 'claude-opus-5-5', label: 'Claude Opus 5.5', description: 'Deep reasoning · slowest' },
      { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', description: 'Balanced · default' },
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Fast · classification' },
    ],
  },
  {
    label: 'Internal',
    items: [
      { value: 'ranker-v3', label: 'Ranker v3', description: 'Retired', disabled: true },
      { value: 'ranker-v4', label: 'Ranker v4', description: 'Puzzle difficulty' },
    ],
  },
]

const environments = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'preview', label: 'Preview' },
]

const meta = {
  title: 'Components/Forms/Select',
  component: Select,
  args: { items: environments, label: 'Environment', defaultValue: 'staging' },
  parameters: {
    docs: {
      description: {
        component:
          'The trigger is cut like an input; the popup floats, so it takes the one blurred shadow in the system **and** keeps its keyline — in the dark theme a shadow on a near-black ground disappears. **Highlighted** (where the cursor is) is a full ink fill; **selected** (the current value) is a check and a wash. A list where the current value looks like the cursor makes an operator press Enter on the wrong row.',
      },
    },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="max-w-xs">
      <Select {...args} />
    </div>
  ),
}

function GroupedDemo() {
  const [value, setValue] = useState<string | null>('claude-sonnet-5-5')
  return (
    <div className="grid max-w-sm gap-3">
      <Field label="Model" hint="Applies to new runs only.">
        {(control) => <Select {...control} items={models} value={value} onValueChange={setValue} />}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Value: <span className="literal text-ink-2">{value ?? 'null'}</span>
      </p>
    </div>
  )
}

export const GroupedInField: Story = {
  name: 'Grouped, inside Field',
  render: () => <GroupedDemo />,
}

export const Placeholder: Story = {
  args: { defaultValue: undefined, placeholder: 'Choose an environment' },
  render: (args) => (
    <div className="max-w-xs">
      <Select {...args} />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Select aria-label="Small" size="sm" items={environments} defaultValue="production" />
      <Select aria-label="Medium" size="md" items={environments} defaultValue="production" />
      <Select aria-label="Large" size="lg" items={environments} defaultValue="production" />
    </div>
  ),
}

export const InvalidAndDisabled: Story = {
  name: 'Invalid and disabled',
  render: () => (
    <div className="grid max-w-xs gap-6">
      <Field label="Region" required error="Pick where this agent runs.">
        {(control) => <Select {...control} items={environments} placeholder="Select…" />}
      </Field>
      <Select label="Locked" items={environments} defaultValue="production" disabled />
    </div>
  ),
}
