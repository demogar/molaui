import type { Meta, StoryObj } from '@storybook/react-vite'
import { AtSign, Globe, Timer } from 'lucide-react'
import { useState } from 'react'

import { Field } from './field'
import { Input } from './input'
import { Label } from './label'
import { SearchInput } from './search-input'
import { Textarea } from './textarea'

const meta = {
  title: 'Components/Forms/Field',
  component: Field,
  parameters: {
    docs: {
      description: {
        component:
          'Label, control and hint or error, wired so the caller cannot forget the half a screen reader depends on. `children` is a **render prop** rather than `cloneElement`: the `id`, `aria-describedby` and `aria-invalid` it computes are spread onto the control in plain sight, onto any control — `Input`, `Textarea`, a `Select` trigger, a native `<select>`.',
      },
    },
  },
  args: { label: 'Run name', children: (control) => <Input {...control} /> },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field label="Run name" hint="Shown in the run list and in alerts.">
        {(control) => <Input {...control} placeholder="nightly-eval-openings" />}
      </Field>
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field label="Required" required>
        {(control) => <Input {...control} defaultValue="growth-agent" />}
      </Field>
      <Field label="Webhook URL" optional hint="We POST the run summary here when it finishes.">
        {(control) => <Input {...control} leading={<Globe />} placeholder="https://" />}
      </Field>
      <Field label="Timeout" error="Must be between 1 and 900 seconds.">
        {(control) => <Input {...control} defaultValue="1200" trailing="s" />}
      </Field>
      <Field label="Run id" hint="Assigned by the scheduler; read only.">
        {(control) => <Input {...control} readOnly defaultValue="run_01J9X3K2QW" className="font-mono [font-variation-settings:'wdth'_87.5] text-sm" />}
      </Field>
      <Field label="Owner">
        {(control) => <Input {...control} disabled defaultValue="Platform team" />}
      </Field>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Hover reveals **gold**, not red: in a product system red is `danger`, and an invalid control already wears a permanent rojo band — a red hover would make every field the pointer crossed look, for a moment, like it had failed. The error carries a cut square as well as colour, so it survives greyscale and forced colours (WCAG 1.4.1).',
      },
    },
  },
}

export const Adornments: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field label="Notify">
        {(control) => <Input {...control} leading={<AtSign />} placeholder="channel or handle" />}
      </Field>
      <Field label="Step budget" hint="The agent stops after this long, whatever it is doing.">
        {(control) => <Input {...control} leading={<Timer />} defaultValue="90" trailing="seconds" inputMode="numeric" />}
      </Field>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'With an adornment the cut moves to a wrapper and the input goes transparent, so the unit sits inside the same keyline as the number. A unit outside the box reads as a second field.',
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="grid max-w-md gap-4">
      <Input size="sm" aria-label="Small" placeholder="Small — table filters" />
      <Input size="md" aria-label="Medium" placeholder="Medium — forms" />
      <Input size="lg" aria-label="Large" placeholder="Large — a single prominent field" />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Heights are density tokens. Switch **Density** in the toolbar and every size moves with it.' },
    },
  },
}

export const TextareaAutosize: Story = {
  name: 'Textarea',
  render: () => (
    <div className="grid max-w-xl gap-6">
      <Field label="System prompt" hint="Grows with its content — `field-sizing: content`, no script." labelAside="412 / 8,000">
        {(control) => (
          <Textarea
            {...control}
            autosize
            rows={3}
            defaultValue={
              'You are the knowledge agent for the coaching team.\nAnswer from the attached opening repertoire only, and cite the source page for every claim.'
            }
          />
        )}
      </Field>
      <Field label="Notes" optional>
        {(control) => <Textarea {...control} placeholder="Anything the next on-call should know" />}
      </Field>
    </div>
  ),
}

function SearchDemo() {
  const [query, setQuery] = useState('')
  return (
    <div className="grid max-w-md gap-3">
      <SearchInput
        aria-label="Search runs"
        placeholder="Search runs"
        shortcut="⌘K"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="m-0 text-xs text-ink-muted tabular">Query: “{query}”</p>
    </div>
  )
}

export const Search: Story = {
  render: () => <SearchDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'The key cap shows while the field is empty; once there is a query, the same slot becomes a named clear button that returns focus to the field. The browser’s own rounded cancel glyph is removed.',
      },
    },
  },
}

export const LabelOnly: Story = {
  name: 'Label',
  render: () => (
    <div className="grid gap-3">
      <Label>Model</Label>
      <Label required>Model</Label>
      <Label optional>Model</Label>
    </div>
  ),
}
