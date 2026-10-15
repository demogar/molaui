import * as React from 'react'

import { Button } from '../../components/button'
import { Callout } from '../../components/callout'
import { Checkbox, CheckboxGroup } from '../../components/checkbox'
import { Combobox } from '../../components/combobox'
import { DatePicker } from '../../components/date-picker'
import { DescriptionList } from '../../components/description-list'
import { Field, Input, Textarea } from '../../components/field'
import { FileUpload } from '../../components/file-upload'
import { Form, FormErrorSummary } from '../../components/form'
import { NumberInput } from '../../components/number-input'
import { Radio, RadioGroup } from '../../components/radio'
import { Select } from '../../components/select'
import { Skeleton, SkeletonGroup } from '../../components/skeleton'
import { Slider } from '../../components/slider'
import { Switch } from '../../components/switch'
import { MODELS, ON_FAILURE, OWNERS, SAVED_AGENT, TEAMMATES, TODAY, TOOLS } from './_data'

/**
 * An agent's configuration: one form with every kind of control a platform
 * team fills in, validated when it is submitted. It was the Form example
 * showcase under Components/Forms; it became a pattern because it is a
 * screen to copy, with states a reader needs to see, not a part to pick.
 * It is named for what it shows, the round trip of a submit that finds
 * problems, so it is not mistaken for the Form component it is built on.
 *
 * ── errors on submit, one announcement ──
 * Nothing is flagged while someone is still filling the form in. Submitting
 * it validates every field at once. It is a `Form` with a
 * `FormErrorSummary` at its top: the summary lists the problems as links to
 * their fields and takes focus, and that focus move is the one
 * announcement. Inside it, each field's error is part of its control's
 * description rather than an alert of its own, so six problems are not
 * six alerts fired in one tick. Moving focus to the first invalid field
 * with each error its own alert was how this form worked first; the alerts
 * raced each other and the focus move.
 *
 * ── every control in its field ──
 * Each control is wrapped in a Field, so its label, hint and error are
 * wired by Field rather than by hand, and "required" is a word beside the
 * label, not a red asterisk alone. The tools are a CheckboxGroup with a
 * legend, because they are one question with several answers; its error is
 * CheckboxGroup's own `error`, since a group has no single control for Field
 * to wrap.
 *
 * ── loading, and reading without the right to change ──
 * While the configuration loads, the card keeps its header and the fields
 * are skeletons in their columns, inside one SkeletonGroup that says
 * "Loading the configuration" once; Save waits for values to save.
 * Someone who may not change the agent sees the saved configuration as
 * text, with a callout naming who can, rather than a form of disabled
 * controls that looks editable and answers only with a refusal on Save.
 */

type Errors = Partial<Record<'name' | 'model' | 'prompt' | 'tools' | 'budget' | 'goLive' | 'reviewers', string>>

export interface AgentFormScreenProps {
  /** The configuration has not arrived yet: the fields as skeletons. */
  loading?: boolean
  /** Whether this person may change the agent. Someone who may not sees the saved values as text. */
  canEdit?: boolean
  /** Validate on mount, as if Save had been pressed with the form empty. For stories and screenshots. */
  defaultValidated?: boolean
  /** How long the fake save takes, in ms. */
  saveDelay?: number
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' })
const integer = new Intl.NumberFormat('en-US')

function validate(
  data: FormData,
  { model, tools, budget, goLive, reviewers }: { model: string | null; tools: string[]; budget: number | null; goLive: Date | null; reviewers: string[] },
): Errors {
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

function CardHeader({ titleId }: { titleId: string }) {
  return (
    <>
      <header className="flex flex-col gap-1 px-6 pt-6 pb-5">
        <h2 id={titleId} className="m-0 font-display text-xl font-bold wdth-display tracking-display">
          Agent configuration
        </h2>
        <p className="m-0 text-sm text-ink-muted">Changes apply to runs started after you save.</p>
      </header>
      <div className="relleno band-oro" aria-hidden />
    </>
  )
}

/** The fields in their columns, before any value has arrived. */
function FormSkeleton() {
  const field = (wide = false) => (
    <div className={wide ? 'flex flex-col gap-2 sm:col-span-2' : 'flex flex-col gap-2'}>
      <Skeleton shape="text" className="w-1/3 text-sm" />
      <Skeleton className={wide ? 'h-24' : 'h-(--control-h)'} />
    </div>
  )
  return (
    <div className="grid grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-2">
      {field()}
      {field()}
      {field(true)}
      {field()}
      {field()}
      {field(true)}
    </div>
  )
}

/** The saved configuration, stated as text for someone who may not change it. */
function ReadOnlyConfiguration() {
  const name = (list: { value: string; label: string }[], value: string) => list.find((item) => item.value === value)?.label ?? value
  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <Callout tone="info" variant="flat" headingLevel={3} title="Only this agent’s owners can change its configuration">
        Ask {OWNERS.join(' or ')} to change anything here.
      </Callout>
      <DescriptionList
        items={[
          { term: 'Name', detail: SAVED_AGENT.name, literal: true },
          { term: 'Model', detail: name(MODELS, SAVED_AGENT.model) },
          { term: 'System prompt', detail: SAVED_AGENT.prompt },
          { term: 'Temperature', detail: String(SAVED_AGENT.temperature) },
          { term: 'Token budget per run', detail: `${integer.format(SAVED_AGENT.budget)} tokens` },
          { term: 'Go live on', detail: dateFormat.format(SAVED_AGENT.goLive) },
          { term: 'Reviewers', detail: SAVED_AGENT.reviewers.map((r) => name(TEAMMATES, r)).join(', ') },
          { term: 'Grounding documents', detail: SAVED_AGENT.documents.join(', '), literal: true },
          { term: 'Tools', detail: SAVED_AGENT.tools.join(', '), literal: true },
          { term: 'When a tool call fails', detail: name(ON_FAILURE, SAVED_AGENT.onFailure) },
          { term: 'Stream responses', detail: SAVED_AGENT.stream ? 'On' : 'Off' },
        ]}
      />
    </div>
  )
}

export function AgentFormScreen({ loading = false, canEdit = true, defaultValidated = false, saveDelay = 1200 }: AgentFormScreenProps) {
  const [model, setModel] = React.useState<string | null>(null)
  const [tools, setTools] = React.useState<string[]>(['search_tickets'])
  const [budget, setBudget] = React.useState<number | null>(null)
  const [goLive, setGoLive] = React.useState<Date | null>(null)
  const [reviewers, setReviewers] = React.useState<string[]>([])
  const [errors, setErrors] = React.useState<Errors>({})
  const [saved, setSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const summaryRef = React.useRef<HTMLDivElement>(null)
  const titleId = `${React.useId()}-title`

  const check = (form: HTMLFormElement) => {
    const next = validate(new FormData(form), { model, tools, budget, goLive, reviewers })
    setErrors(next)
    return next
  }

  React.useEffect(() => {
    if (!defaultValidated || !formRef.current) return
    // Once, on mount: the story opens as if Save had just been pressed, and
    // a mount is not a submit, so `Form` would not move focus by itself. A
    // frame later, because the summary renders only once the fields have
    // registered their errors, which they do after this render.
    if (Object.keys(check(formRef.current)).length > 0) requestAnimationFrame(() => summaryRef.current?.focus())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    // `Form` moves focus to the summary once these errors have rendered.
    if (Object.keys(check(event.currentTarget)).length > 0) return
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      setSaved(true)
    }, saveDelay)
  }

  const card = 'grid max-w-2xl grid-cols-1 gap-0 bg-cloth-pale shadow-cut'

  if (loading || !canEdit) {
    return (
      <div className="p-4 sm:p-6">
        <section aria-labelledby={titleId} className={card}>
          <CardHeader titleId={titleId} />
          {loading ? <SkeletonGroup loading label="Loading the configuration" fallback={<FormSkeleton />} /> : <ReadOnlyConfiguration />}
        </section>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <Form ref={formRef} onSubmit={onSubmit} className={card} aria-labelledby={titleId}>
        <CardHeader titleId={titleId} />

        <div className="grid grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-2">
          <FormErrorSummary ref={summaryRef} className="sm:col-span-2" description="Nothing has been saved. Each link goes to its field." />
          <Field label="Name" required error={errors.name} hint="Used in run ids: refund-reviewer-…">
            {(control) => <Input {...control} name="name" placeholder="refund-reviewer" autoComplete="off" />}
          </Field>
          <Field label="Model" required error={errors.model}>
            {(control) => <Select {...control} items={MODELS} value={model} onValueChange={setModel} placeholder="Choose a model" />}
          </Field>
          <div className="sm:col-span-2">
            <Field label="System prompt" required error={errors.prompt} hint="Plain language. The agent sees this before every conversation.">
              {(control) => (
                <Textarea
                  {...control}
                  name="prompt"
                  autosize
                  rows={3}
                  placeholder="You are the refund reviewer. Answer only from the refund policy…"
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

        <div className="grid grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-2">
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
              <DatePicker {...control} name="goLive" locale="en-GB" today={TODAY} min={TODAY} value={goLive} onValueChange={setGoLive} />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Reviewers" required error={errors.reviewers} hint="Every change to this agent waits for one of them to approve it.">
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
              {(control) => <FileUpload {...control} name="documents" multiple accept=".pdf,.md" maxSize={10_000_000} locale="en-US" />}
            </Field>
          </div>
        </div>

        <div className="h-px bg-keyline" aria-hidden />

        <div className="grid grid-cols-1 gap-8 px-6 py-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <CheckboxGroup legend="Tools" value={tools} onValueChange={setTools} error={errors.tools}>
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
          </div>
          <div className="flex flex-col gap-6">
            <RadioGroup label="When a tool call fails" name="onFailure" defaultValue="retry">
              {ON_FAILURE.map((option) => (
                <Radio key={option.value} value={option.value} label={option.label} />
              ))}
            </RadioGroup>
            <Switch name="stream" label="Stream responses" description="Tokens appear as they are generated." defaultChecked />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 bg-cloth-shade px-6 py-4 cut-t">
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
      </Form>
    </div>
  )
}
