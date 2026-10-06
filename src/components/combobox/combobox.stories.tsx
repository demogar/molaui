import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useRef, useState } from 'react'

import { Field } from '../field/field'
import { Autocomplete, Combobox, type ComboboxOption, type ComboboxOptionGroup } from './combobox'

// STORY-ONLY. People and tools on Cayuco, the fictional agent platform.
const people: ComboboxOption[] = [
  { value: 'ana-rios', label: 'Ana Ríos', description: 'Evaluation · Panamá' },
  { value: 'bruno-vega', label: 'Bruno Vega', description: 'Platform · Lisboa' },
  { value: 'carla-pinzon', label: 'Carla Pinzón', description: 'Evaluation · Bogotá' },
  { value: 'dalia-osei', label: 'Dalia Osei', description: 'Safety · Accra' },
  { value: 'emil-strand', label: 'Emil Strand', description: 'Platform · Oslo' },
  { value: 'farah-haddad', label: 'Farah Haddad', description: 'Safety · Amman' },
  { value: 'gael-moreno', label: 'Gael Moreno', description: 'On leave', disabled: true },
  { value: 'hana-sato', label: 'Hana Sato', description: 'Retrieval · Osaka' },
]

const tools: ComboboxOptionGroup[] = [
  {
    label: 'Retrieval',
    items: [
      { value: 'search_docs', label: 'search_docs', literal: true, description: 'Full-text search over the knowledge base' },
      { value: 'fetch_page', label: 'fetch_page', literal: true, description: 'Read one page by id' },
      { value: 'query_runs', label: 'query_runs', literal: true, description: 'SQL over the run history' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { value: 'open_ticket', label: 'open_ticket', literal: true, description: 'File an incident with the on-call team' },
      { value: 'post_message', label: 'post_message', literal: true, description: 'Write to a team channel' },
      { value: 'pause_rollout', label: 'pause_rollout', literal: true, description: 'Requires approval', disabled: true },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { value: 'run_eval', label: 'run_eval', literal: true, description: 'Score a prompt set against a model' },
      { value: 'compare_runs', label: 'compare_runs', literal: true, description: 'Diff two runs step by step' },
    ],
  },
]

const meta = {
  title: 'Components/Forms/Combobox',
  component: Combobox,
  parameters: {
    docs: {
      description: {
        component:
          'A select you can type into, for lists too long to scroll. **`Combobox` always ends on one of its options** — the text is a filter, and the form submits a value the list offered. **`Autocomplete` is free text with suggestions** — what you type is the value. Two components rather than a flag, because "what happens to a half-typed word?" is the question the name answers.\n\n' +
          'The field is cut like every other control; the popup and rows are the Select’s, so highlighted (the cursor) is the ink fill and selected (the value) a check and a wash. The popup is never silently empty: it says **Searching…** next to the working relleno while results load, and **No matches** when the filter leaves nothing. With `multiple`, each value is the system’s chip inside the field; the keyboard reaches the chips from the start of the input (ArrowLeft, ArrowRight in right-to-left), and the input’s description says so. Behaviour is Base UI’s Combobox and Autocomplete.',
      },
    },
  },
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

function ReviewerDemo() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div className="grid max-w-sm gap-3">
      <Field label="Reviewer" required hint="They approve the run before it ships to production.">
        {(control) => (
          <Combobox
            {...control}
            name="reviewer"
            items={people}
            value={value}
            onValueChange={setValue}
            placeholder="Search people"
          />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Submits: <span className="literal text-ink-2">{value ?? '—'}</span>
      </p>
    </div>
  )
}

export const Default: Story = {
  args: { items: people },
  render: () => <ReviewerDemo />,
}

export const Grouped: Story = {
  args: { items: tools },
  parameters: {
    docs: {
      description: {
        story:
          'Groups take the Select’s small-caps label and keyline separator. A disabled tool stays in the list with its reason in the description, rather than vanishing — an operator searching for `pause_rollout` should learn why they cannot have it.',
      },
    },
  },
  render: () => (
    <div className="max-w-sm">
      <Field label="Tool" hint="The agent can call this tool without asking.">
        {(control) => <Combobox {...control} items={tools} placeholder="Search tools" />}
      </Field>
    </div>
  ),
}

function NotifyDemo() {
  const [value, setValue] = useState<string[]>(['ana-rios', 'dalia-osei'])
  return (
    <div className="grid max-w-md gap-3">
      <Field label="Notify on failure" hint="Each person gets the run summary and a link to the failing step.">
        {(control) => (
          <Combobox {...control} multiple name="notify" items={people} value={value} onValueChange={setValue} placeholder="Add people" />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Submits: <span className="literal text-ink-2">{value.length > 0 ? value.join(', ') : '—'}</span>
      </p>
    </div>
  )
}

export const Multiple: Story = {
  name: 'Multiple, with chips',
  args: { items: people },
  parameters: {
    docs: {
      description: {
        story:
          'Chips wrap inside the field, which grows a row at a time in steps of the chip height, so one row is exactly the height of a single-value field. Backspace in an empty input removes the last chip; each chip’s remove button is named “Remove” and the person’s name.',
      },
    },
  },
  render: () => <NotifyDemo />,
}

// A fake directory search: 400ms of latency, then whatever matches.
const RUNS: ComboboxOption[] = Array.from({ length: 128 }, (_, i) => {
  const id = 4120 + i
  const agent = ['support-triage', 'release-notes', 'eval-sweeper', 'kb-curator'][i % 4]!
  return { value: `run-${id}`, label: `run-${id} · ${agent}`, description: `${(i * 7) % 60} min ago` }
})

function AsyncDemo() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ComboboxOption[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function search(next: string) {
    setQuery(next)
    clearTimeout(timer.current)
    if (!next.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timer.current = setTimeout(() => {
      setResults(RUNS.filter((run) => run.label.includes(next.trim().toLowerCase())))
      setLoading(false)
    }, 400)
  }

  const shown = results.slice(0, 6)
  return (
    <div className="max-w-sm">
      <Field label="Compare with run" hint="Type a run number or an agent name.">
        {(control) => (
          <Combobox
            {...control}
            items={shown}
            filter={null}
            loading={loading}
            onInputValueChange={search}
            status={!loading && results.length > shown.length ? `Showing ${shown.length} of ${results.length}` : undefined}
            emptyMessage={query.trim() ? `No runs match “${query.trim()}”` : 'Start typing to search 128 runs'}
            placeholder="run-4187 or eval-sweeper"
          />
        )}
      </Field>
    </div>
  )
}

export const AsyncSearch: Story = {
  name: 'Async search',
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story:
          'A server search: `filter={null}` hands filtering to the caller, `onInputValueChange` reports each keystroke, `loading` shows the working texture and **Searching…**, and `status` carries the "6 of 41" line a truncated result needs. The empty message is written for the moment — before typing it says what can be searched, after it names the query that found nothing.',
      },
    },
  },
  render: () => <AsyncDemo />,
}

const RECENT_LABELS = ['nightly-regression', 'nightly-retrieval', 'red-team-q4', 'latency-sweep', 'kb-refresh']

export const FreeText: Story = {
  name: 'Autocomplete (free text)',
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story:
          'The label is whatever you type; recent labels are offered to save keystrokes and keep naming consistent. Nothing is lost on blur, which is the difference from `Combobox`.',
      },
    },
  },
  render: () => (
    <div className="max-w-sm">
      <Field label="Run label" optional hint="Shown in the runs table and in alerts.">
        {(control) => <Autocomplete {...control} name="label" items={RECENT_LABELS} placeholder="nightly-regression" />}
      </Field>
    </div>
  ),
}

export const InvalidAndDisabled: Story = {
  name: 'Invalid and disabled',
  args: { items: people },
  render: () => (
    <div className="grid max-w-sm gap-6">
      <Field label="Reviewer" required error="Choose who approves this run.">
        {(control) => <Combobox {...control} items={people} placeholder="Search people" />}
      </Field>
      <Field label="Owners" hint="Owners are set by the workspace admin.">
        {(control) => <Combobox {...control} multiple items={people} defaultValue={['bruno-vega', 'hana-sato']} disabled />}
      </Field>
    </div>
  ),
}

export const Sizes: Story = {
  args: { items: people },
  render: () => (
    <div className="grid max-w-sm gap-3">
      <Combobox aria-label="Small" size="sm" items={people} defaultValue="ana-rios" />
      <Combobox aria-label="Medium" items={people} defaultValue="ana-rios" />
      <Combobox aria-label="Large" size="lg" items={people} defaultValue="ana-rios" />
    </div>
  ),
}
