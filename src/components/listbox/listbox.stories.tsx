import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { Fieldset } from '../form/fieldset'
import { Listbox } from './listbox'

const regions = [
  { value: 'pty', label: 'Panama City', description: 'pty-1 · primary' },
  { value: 'dav', label: 'David', description: 'dav-1 · replica' },
  { value: 'col', label: 'Colón', description: 'col-1 · replica' },
  { value: 'san', label: 'Santiago', description: 'san-1 · archive' },
]

const meta = {
  title: 'Components/Forms/Listbox',
  tags: ['experimental'],
  component: Listbox,
  args: {
    'aria-label': 'Primary region',
    options: regions.map(({ value, label }) => ({ value, label })),
    defaultValue: 'pty',
    className: 'w-full max-w-64',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A list of options that **stays on the page**: choose one, or several, without opening anything. Base UI has no standalone listbox, so this is the WAI-ARIA APG pattern written out: one tab stop, roving focus, type-ahead. In a single list **selection follows focus**, as in a radio group; in a multiple list the arrows only move and **Space** toggles, so moving never loses a choice. A chosen option is a value, so it takes the **ink fill** and a mark (a check, or a filled square when several can be chosen), and a multiple list shows its empty squares before anything is chosen. Disabled options stay focusable, so a keyboard user learns they exist.',
      },
    },
  },
} satisfies Meta<typeof Listbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Multiple: Story = {
  args: {
    'aria-label': 'Models to compare',
    multiple: true,
    defaultValue: ['swift', 'deep'],
    options: [
      { value: 'swift', label: 'Cayuco Swift', description: '32k context · fastest' },
      { value: 'steady', label: 'Cayuco Steady', description: '128k context' },
      { value: 'deep', label: 'Cayuco Deep', description: '200k context · slowest' },
      { value: 'classic', label: 'Cayuco Classic', description: 'Retired for new evaluations', disabled: true },
    ],
    className: 'w-full max-w-72',
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `multiple`, every option carries a square, empty until chosen. Space toggles; Shift with an arrow extends; Control+A chooses every option that can be chosen, or clears them all. The retired model stays in the list and in the tab order, and its description says why it cannot be chosen rather than fading it.',
      },
    },
  },
}

export const WithDescriptions: Story = {
  args: {
    options: regions,
  },
  parameters: {
    docs: {
      description: {
        story: 'A second line per option, read as its description, so the name stays short: the region, then its code and role.',
      },
    },
  },
}

function LabelledDemo() {
  const [value, setValue] = useState<string[]>(['billing'])
  const options = [
    { value: 'billing', label: 'Billing' },
    { value: 'retention', label: 'Retention' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'support', label: 'Support' },
    { value: 'security', label: 'Security' },
  ]
  return (
    <div className="flex w-full max-w-64 flex-col gap-2">
      <span id="listbox-topics" className="rotulo text-ink-2">
        Topics the agent may answer
      </span>
      <Listbox aria-labelledby="listbox-topics" multiple value={value} onValueChange={setValue} options={options} />
      <p className="m-0 text-sm text-ink-2" aria-live="polite">
        {value.length === 0 ? 'No topics chosen.' : `${value.length} of ${options.length} topics chosen.`}
      </p>
    </div>
  )
}

export const Labelled: Story = {
  name: 'Named by a visible label',
  render: () => <LabelledDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Named by the label above it through `aria-labelledby`, rather than a second, invisible `aria-label`. The count under it is the caller’s, from `onValueChange`.',
      },
    },
  },
}

export const Scrolling: Story = {
  args: {
    'aria-label': 'Workspace',
    defaultValue: 'ws-09',
    options: Array.from({ length: 14 }, (_, i) => ({
      value: `ws-${String(i + 1).padStart(2, '0')}`,
      label: `Cayuco workspace ${i + 1}`,
    })),
    className: 'w-full max-w-64 max-h-64',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A height from `className` makes the list scroll. Focus scrolls the option into view, and the focus ring is drawn inside the option so the list’s edge never clips it.',
      },
    },
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A disabled list keeps its options readable and its value shown, on the shaded ground, and leaves the tab order, as a disabled native list does.',
      },
    },
  },
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Listbox
          aria-label="Escalation policy"
          defaultValue="page"
          options={[
            {
              value: 'page',
              label: 'Page the on-call owner of the agent and pause every run in the workspace',
              description: 'pty-1 · applies to production and staging workspaces alike',
            },
            { value: 'notify', label: 'Notify the team channel and keep the remaining runs going' },
          ]}
        />
      </HardState>
      <HardState state="rtl">
        <Listbox
          aria-label="المنطقة الأساسية"
          defaultValue="pty"
          className="w-full max-w-64"
          options={[
            { value: 'pty', label: 'مدينة بنما', description: 'pty-1 · أساسية' },
            { value: 'dav', label: 'دافيد', description: 'dav-1 · نسخة متماثلة' },
            { value: 'col', label: 'كولون', description: 'col-1 · نسخة متماثلة' },
          ]}
        />
      </HardState>
      <HardState state="disabled">
        <Listbox
          aria-label="Models to compare"
          multiple
          defaultValue={['swift' as string]}
          className="w-full max-w-72"
          options={[
            { value: 'swift', label: 'Cayuco Swift', description: '32k context · fastest' },
            { value: 'classic', label: 'Cayuco Classic', description: 'Retired for new evaluations', disabled: true },
          ]}
        />
      </HardState>
      <HardState state="error">
        <Fieldset legend="Topics the agent may answer" error="Choose at least one topic.">
          <Listbox
            aria-label="Topics the agent may answer"
            aria-invalid
            multiple
            className="w-full max-w-64"
            options={[
              { value: 'billing', label: 'Billing' },
              { value: 'retention', label: 'Retention' },
              { value: 'security', label: 'Security' },
            ]}
          />
        </Fieldset>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Long option labels truncate on one line and their descriptions with them, so the list keeps its rhythm; the whole text is still the accessible name. In right to left the check moves to the start and the selected row’s fill and focus ring mirror. A disabled option stays in the list and in the tab order with its reason. A list fails as a group: the error belongs to the fieldset around it, under its legend.',
      },
    },
  },
}
