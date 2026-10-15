import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { Button } from '../button'
import { Checkbox, CheckboxGroup } from '../checkbox'
import { Field, Input } from '../field'
import { NumberInput } from '../number-input'
import { Fieldset } from './fieldset'
import { Form } from './form'
import { FormErrorSummary } from './form-error-summary'

const meta = {
  title: 'Components/Forms/Form',
  tags: ['experimental'],
  component: Form,
  parameters: {
    docs: {
      description: {
        component:
          'A `<form>` that knows which of its fields are failing. Each `Field`, `Fieldset` and `CheckboxGroup` inside registers its error, so a **`FormErrorSummary`** can list every one as a link to its control. On the submit that finds problems, focus moves to the summary, and that focus move is the **one** announcement; while a summary is mounted, each field’s error drops `role="alert"` and stays in the control’s description. Without a summary, focus goes to the first invalid control. Built on Base UI’s `Form` and `Fieldset`.',
      },
    },
  },
} satisfies Meta<typeof Form>

export default meta
type Story = StoryObj<typeof meta>

type WebhookErrors = Partial<Record<'name' | 'url' | 'events' | 'retries', string>>

const EVENTS = [
  { value: 'run.failed', description: 'A run ends in an error or times out.' },
  { value: 'run.succeeded', description: 'A run finishes and returns an answer.' },
  { value: 'approval.requested', description: 'An agent waits for a person to approve a tool call.' },
]

function validateWebhook(data: { name: string; url: string; events: string[]; min: number | null; max: number | null }) {
  const errors: WebhookErrors = {}
  if (!data.name.trim()) errors.name = 'Name the webhook, so the delivery log can say which one fired.'
  if (!/^https:\/\/\S+$/.test(data.url)) errors.url = 'Enter an https:// address; Cayuco does not deliver over plain http.'
  if (data.events.length === 0) errors.events = 'Choose at least one event, or the webhook never fires.'
  if (data.min === null || data.max === null) errors.retries = 'Set both the first and the last retry delay.'
  else if (data.max <= data.min) errors.retries = 'The last retry must wait longer than the first.'
  return errors
}

function WebhookForm({ validated = false }: { validated?: boolean }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState(validated ? 'http://hooks.cayuco.example/runs' : '')
  const [events, setEvents] = useState<string[]>([])
  const [min, setMin] = useState<number | null>(validated ? 60 : null)
  const [max, setMax] = useState<number | null>(validated ? 30 : null)
  const [errors, setErrors] = useState<WebhookErrors>(() =>
    validated ? validateWebhook({ name, url, events, min, max }) : {},
  )
  const [saved, setSaved] = useState(false)

  return (
    <Form
      aria-labelledby="webhook-title"
      onSubmit={(event) => {
        event.preventDefault()
        const next = validateWebhook({ name, url, events, min, max })
        setErrors(next)
        setSaved(Object.keys(next).length === 0)
      }}
      className="flex max-w-xl flex-col gap-6 bg-cloth-pale p-6 shadow-cut"
    >
      <h2 id="webhook-title" className="m-0 font-display text-xl font-bold wdth-display tracking-display">
        New webhook
      </h2>
      <FormErrorSummary description="Nothing has been saved yet." />
      <Field label="Name" required error={errors.name}>
        {(control) => <Input {...control} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}
      </Field>
      <Field label="Endpoint" required error={errors.url} hint="Cayuco POSTs a JSON body to this address.">
        {(control) => (
          <Input {...control} type="url" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        )}
      </Field>
      <CheckboxGroup legend="Events" value={events} onValueChange={setEvents} error={errors.events}>
        {EVENTS.map((event) => (
          <Checkbox key={event.value} value={event.value} label={<span className="literal">{event.value}</span>} description={event.description} />
        ))}
      </CheckboxGroup>
      <Fieldset legend="Retry delays" description="Failed deliveries are retried five times, waiting longer each time." error={errors.retries}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,calc(var(--control-h)*5)),1fr))] gap-4">
          <Field label="First retry">
            {(control) => <NumberInput {...control} locale="en-US" unit="seconds" min={1} value={min} onValueChange={setMin} />}
          </Field>
          <Field label="Last retry">
            {(control) => <NumberInput {...control} locale="en-US" unit="seconds" min={1} value={max} onValueChange={setMax} />}
          </Field>
        </div>
      </Fieldset>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p role="status" className="m-0 me-auto text-sm text-ink-success">
          {saved ? 'Webhook saved. Cayuco sends a test delivery now.' : ''}
        </p>
        <Button type="submit">Save webhook</Button>
      </div>
    </Form>
  )
}

export const Default: Story = {
  render: () => <WebhookForm />,
  parameters: {
    docs: {
      description: {
        story:
          'Press **Save webhook** with the form empty. The summary appears above the fields and takes focus; each link moves focus to its field and scrolls the field’s label into view. Fix a field and press Save again: the list shrinks, and the summary goes when nothing is left.',
      },
    },
  },
}

export const WithErrors: Story = {
  render: () => <WebhookForm validated />,
  parameters: {
    docs: {
      description: {
        story:
          'After a failed save. Each link reads “Label: message”, because “The last retry must wait longer than the first” means little in a list that has left its field behind. The group errors (Events, Retry delays) sit under their legend, above the controls, and their links focus the first control in the group.',
      },
    },
  },
}

export const FieldsetGroup: Story = {
  name: 'Fieldset',
  render: () => (
    <div className="grid max-w-md gap-8">
      <Fieldset legend="Run window" description="Scheduled runs start only inside this window, in the workspace’s time zone.">
        <Field label="From">
          {(control) => <Input {...control} type="time" defaultValue="22:00" />}
        </Field>
        <Field label="Until">
          {(control) => <Input {...control} type="time" defaultValue="06:00" />}
        </Field>
      </Fieldset>
      <Fieldset legend="Legacy limits" description="Managed by the Cayuco platform team." disabled>
        <Field label="Requests per minute">
          {(control) => <Input {...control} disabled defaultValue="600" />}
        </Field>
      </Fieldset>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A real `<fieldset>` named by its legend, so “From” and “Until” are heard as the bounds of the run window. A disabled fieldset disables every Base UI control inside and says so in the legend’s ink; nothing is faded.',
      },
    },
  },
}

function WithoutSummaryForm() {
  const [error, setError] = useState<string | undefined>()
  return (
    <Form
      aria-label="Rename agent"
      onSubmit={(event) => {
        event.preventDefault()
        const value = String(new FormData(event.currentTarget).get('name') ?? '').trim()
        setError(value ? undefined : 'Give the agent a name.')
      }}
      className="flex max-w-md flex-col gap-4"
    >
      <Field label="Agent name" required error={error}>
        {(control) => <Input {...control} name="name" defaultValue="" />}
      </Field>
      <Button type="submit" className="self-start">
        Rename
      </Button>
    </Form>
  )
}

export const WithoutSummary: Story = {
  render: () => <WithoutSummaryForm />,
  parameters: {
    docs: {
      description: {
        story:
          'One field needs no summary. Without one, the form moves focus to the first invalid control after the submit, and the field’s error keeps `role="alert"`, because it is the only announcement there is.',
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
        <Form aria-label="Delivery limits" className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
          <FormErrorSummary description="Nothing has been saved yet." />
          <Field
            label="Address Cayuco posts the signed delivery receipt to after every successful run"
            required
            error="Enter an https:// address; Cayuco does not deliver signed receipts over plain http."
          >
            {(control) => <Input {...control} type="url" dir="ltr" defaultValue="http://hooks.cayuco.example/receipts/refund-triage" />}
          </Field>
        </Form>
      </HardState>
      <HardState state="rtl">
        <Form aria-label="إعادة تسمية الوكيل" className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
          <Field label="اسم الوكيل" required>
            {(control) => <Input {...control} defaultValue="وكيل الدعم" />}
          </Field>
          <Button type="submit" className="self-start">
            حفظ
          </Button>
        </Form>
      </HardState>
      <HardState state="disabled">
        <Form aria-label="Legacy limits" className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
          <Fieldset legend="Legacy limits" description="Managed by the Cayuco platform team." disabled>
            <Field label="Requests per minute">
              {(control) => <Input {...control} disabled defaultValue="600" />}
            </Field>
          </Fieldset>
          <Button type="submit" disabled className="self-start">
            Save limits
          </Button>
        </Form>
      </HardState>
      <HardState state="error">
        <Form aria-label="New webhook" className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
          <FormErrorSummary description="Nothing has been saved yet." />
          <Field label="Name" required error="Name the webhook, so the delivery log can say which one fired.">
            {(control) => <Input {...control} defaultValue="" autoComplete="off" />}
          </Field>
          <CheckboxGroup legend="Events" error="Choose at least one event, or the webhook never fires.">
            <Checkbox value="run.failed" label={<span className="literal">run.failed</span>} />
            <Checkbox value="run.succeeded" label={<span className="literal">run.succeeded</span>} />
          </CheckboxGroup>
        </Form>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long label and a long error wrap inside a phone’s width, and the summary’s link repeats both, so its line wraps too rather than truncating the reason. In right to left the summary, labels and the submit button align to the right. A disabled fieldset disables its controls and the submit says it is disabled rather than fading. The error cell is the summary with a field error and a group error, each a link to its control.',
      },
    },
  },
}
