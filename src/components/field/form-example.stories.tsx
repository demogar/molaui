import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'

import { Button } from '../button'
import { Checkbox, CheckboxGroup } from '../checkbox'
import { Combobox } from '../combobox'
import { DatePicker } from '../date-picker'
import { FileUpload } from '../file-upload'
import { NumberInput } from '../number-input'
import { Radio, RadioGroup } from '../radio'
import { Select } from '../select'
import { Slider } from '../slider'
import { Switch } from '../switch'
import { Field } from './field'
import { Input } from './input'
import { Textarea } from './textarea'

const meta = {
  title: 'Components/Forms/Form example',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Every form component, composed into the kind of form an AI platform team edits daily. Submit it empty to see validation: errors appear under each invalid control, announced on insertion, and **focus moves to the first invalid field** — the behaviour `Field`’s `role="alert"` decision was made for.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const MODELS = [
  { value: 'claude-opus-5-5', label: 'Claude Opus 5.5', description: 'Deep reasoning · slowest' },
  { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', description: 'Balanced · default' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Fast · classification' },
]

const TOOLS = [
  { value: 'search_games', description: 'Query the game archive by player, opening or date.' },
  { value: 'fetch_opening', description: 'Read a line from the opening book.' },
  { value: 'run_engine', description: 'Evaluate a position. Costly; rate-limited.' },
]

const TEAMMATES = [
  { value: 'ana-rios', label: 'Ana Ríos', description: 'Evaluation' },
  { value: 'bruno-vega', label: 'Bruno Vega', description: 'Platform' },
  { value: 'carla-pinzon', label: 'Carla Pinzón', description: 'Evaluation' },
  { value: 'dalia-osei', label: 'Dalia Osei', description: 'Safety' },
  { value: 'hana-sato', label: 'Hana Sato', description: 'Retrieval' },
]

// Pinned so the story renders the same calendar in every screenshot.
const TODAY = new Date(2026, 9, 6)

type Errors = Partial<Record<'name' | 'model' | 'prompt' | 'tools' | 'budget' | 'goLive' | 'reviewers', string>>

function AgentConfigForm() {
  const [model, setModel] = useState<string | null>(null)
  const [tools, setTools] = useState<string[]>(['search_games'])
  const [budget, setBudget] = useState<number | null>(null)
  const [goLive, setGoLive] = useState<Date | null>(null)
  const [reviewers, setReviewers] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function validate(data: FormData): Errors {
    const next: Errors = {}
    const name = String(data.get('name') ?? '').trim()
    if (!name) next.name = 'Give the agent a name; it appears in every run and alert.'
    else if (!/^[a-z0-9-]+$/.test(name)) next.name = 'Lowercase letters, digits and hyphens only.'
    if (!model) next.model = 'Choose the model this agent runs on.'
    if (String(data.get('prompt') ?? '').trim().length < 20)
      next.prompt = 'Write at least 20 characters — an empty system prompt is a default nobody chose.'
    if (tools.length === 0) next.tools = 'Enable at least one tool, or this agent can only talk.'
    if (budget === null) next.budget = 'Set a token budget; a run without one can spend without limit.'
    else if (budget > 200000) next.budget = 'The workspace allows at most 200,000 tokens per run.'
    if (!goLive) next.goLive = 'Choose the day this configuration goes live.'
    if (reviewers.length === 0) next.reviewers = 'Add at least one reviewer to approve changes.'
    return next
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    const next = validate(new FormData(event.currentTarget))
    setErrors(next)
    if (Object.keys(next).length > 0) {
      // After React has rendered the errors, move focus to the first invalid
      // control in DOM order — not the first key in the object.
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
    }, 1200)
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="grid max-w-2xl gap-0 bg-cloth-pale shadow-cut"
      aria-labelledby="agent-config-title"
    >
      <header className="flex flex-col gap-1 px-6 pt-6 pb-5">
        <h2 id="agent-config-title" className="m-0 font-display text-xl font-bold wdth-display tracking-display">
          Agent configuration
        </h2>
        <p className="m-0 text-sm text-ink-muted">Changes apply to runs started after you save.</p>
      </header>

      <div className="relleno band-oro" aria-hidden />

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} hint="Used in run ids: opening-coach-…">
          {(control) => <Input {...control} name="name" placeholder="opening-coach" autoComplete="off" />}
        </Field>
        <Field label="Model" required error={errors.model}>
          {(control) => (
            <Select {...control} items={MODELS} value={model} onValueChange={setModel} placeholder="Choose a model" />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="System prompt"
            required
            error={errors.prompt}
            hint="Plain language. The agent sees this before every conversation."
          >
            {(control) => (
              <Textarea
                {...control}
                name="prompt"
                autosize
                rows={3}
                placeholder="You are the opening coach. Answer only from the repertoire…"
              />
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Slider
            label="Temperature"
            name="temperature"
            defaultValue={0.3}
            min={0}
            max={1}
            step={0.05}
            minLabel="Precise"
            maxLabel="Creative"
          />
        </div>
      </div>

      <div className="h-px bg-keyline" aria-hidden />

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
        <Field label="Token budget per run" required error={errors.budget} hint="Up to 200,000.">
          {(control) => (
            <NumberInput
              {...control}
              name="budget"
              locale="en-US"
              unit="tokens"
              placeholder="40,000"
              min={1000}
              step={1000}
              largeStep={10000}
              value={budget}
              onValueChange={setBudget}
            />
          )}
        </Field>
        <Field label="Go live on" required error={errors.goLive}>
          {(control) => (
            <DatePicker
              {...control}
              name="goLive"
              locale="en-GB"
              today={TODAY}
              min={TODAY}
              value={goLive}
              onValueChange={setGoLive}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Reviewers"
            required
            error={errors.reviewers}
            hint="Every change to this agent waits for one of them to approve it."
          >
            {(control) => (
              <Combobox
                {...control}
                multiple
                name="reviewers"
                items={TEAMMATES}
                value={reviewers}
                onValueChange={setReviewers}
                placeholder="Add people"
              />
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Grounding documents" optional hint="The agent may quote these in answers.">
            {(control) => (
              <FileUpload {...control} name="documents" multiple accept=".pdf,.md" maxSize={10_000_000} locale="en-US" />
            )}
          </Field>
        </div>
      </div>

      <div className="h-px bg-keyline" aria-hidden />

      <div className="grid gap-8 px-6 py-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <CheckboxGroup legend="Tools" value={tools} onValueChange={setTools}>
            {TOOLS.map((tool) => (
              <Checkbox
                key={tool.value}
                value={tool.value}
                label={<span className="literal">{tool.value}</span>}
                description={tool.description}
                aria-invalid={errors.tools ? true : undefined}
              />
            ))}
          </CheckboxGroup>
          {errors.tools ? (
            <span role="alert" className="flex items-start gap-2 text-xs font-medium text-ink-danger">
              <span aria-hidden className="mt-[0.3em] size-2 shrink-0 bg-rojo shadow-cut" />
              {errors.tools}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          <RadioGroup label="When a tool call fails" name="onFailure" defaultValue="retry">
            <Radio value="retry" label="Retry, then continue" />
            <Radio value="skip" label="Skip the step" />
            <Radio value="halt" label="Halt the run" />
          </RadioGroup>
          <Switch name="stream" label="Stream responses" description="Tokens appear as they are generated." defaultChecked />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 bg-cloth-shade px-6 py-4 shadow-[inset_0_1.5px_0_var(--ink)]">
        <p role="status" className="m-0 me-auto text-sm text-ink-success">
          {saved ? 'Saved. New runs use this configuration.' : ''}
        </p>
        <Button
          type="reset"
          variant="ghost"
          onClick={() => {
            setErrors({})
            setBudget(null)
            setGoLive(null)
            setReviewers([])
          }}
        >
          Discard
        </Button>
        <Button type="submit" loading={saving}>
          Save agent
        </Button>
      </footer>
    </form>
  )
}

export const AgentConfiguration: Story = {
  render: () => <AgentConfigForm />,
}
