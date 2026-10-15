import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Checkbox, CheckboxGroup } from '../checkbox'
import { DescriptionList } from '../description-list'
import { Field, Input, Textarea } from '../field'
import { FormErrorSummary } from '../form'
import { Select } from '../select'
import { Stepper, type StepperStep } from './stepper'

const STEPS: StepperStep[] = [
  { id: 'basics', title: 'Basics', description: 'What the agent is called and what it is for.' },
  { id: 'model', title: 'Model', description: 'The model every run of this agent starts on.' },
  { id: 'tools', title: 'Tools', description: 'What the agent may call while it works.' },
  { id: 'review', title: 'Review', description: 'Check the agent before it is created. Nothing runs until you start it.' },
]

const meta = {
  title: 'Components/Navigation/Stepper',
  tags: ['experimental'],
  component: Stepper,
  args: {
    label: 'Steps to create an agent',
    steps: STEPS,
    children: (step: StepperStep) => <p className="m-0 text-sm text-ink-2">The {String(step.title).toLowerCase()} step’s fields go here.</p>,
  },
  parameters: {
    docs: {
      description: {
        component:
          'A task done in order, one step at a time. The list says where you are, in a **glyph, a word and a colour** for each step (a numbered hollow square “To do”, an accent square “Current”, a verde check “Done”, a rojo “!” “Needs fixing”). The panel is a `Form`: **Continue** submits it, `onStepSubmit` validates, and a step with errors stays put while focus goes to its `FormErrorSummary`. When the step changes, focus moves to the new step’s heading. Steps already reached are buttons; later steps are not, because skipping ahead would skip the checks.',
      },
    },
  },
} satisfies Meta<typeof Stepper>

export default meta
type Story = StoryObj<typeof meta>

const MODELS = [
  { value: 'cayuco-deep-3', label: 'Cayuco Deep 3', description: 'Deep reasoning · slowest' },
  { value: 'cayuco-steady-3', label: 'Cayuco Steady 3', description: 'Balanced · default' },
  { value: 'cayuco-swift-2', label: 'Cayuco Swift 2', description: 'Fast · classification' },
]

const TOOLS = [
  { value: 'search_tickets', description: 'Query the ticket archive by account, tag or date.' },
  { value: 'fetch_ticket', description: 'Read one ticket with its full thread.' },
  { value: 'lookup_account', description: 'Read an account’s plan and billing. Rate-limited.' },
]

type Errors = Partial<Record<'name' | 'purpose' | 'model' | 'tools', string>>

function CreateAgent() {
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [model, setModel] = useState<string | null>(null)
  const [tools, setTools] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [created, setCreated] = useState(false)

  const check = (step: string): Errors => {
    const next: Errors = {}
    if (step === 'basics') {
      if (!/^[a-z0-9-]+$/.test(name)) next.name = 'Use lowercase letters, digits and hyphens: refund-reviewer.'
      if (purpose.trim().length < 20) next.purpose = 'Write at least 20 characters, so reviewers know what it is for.'
    }
    if (step === 'model' && !model) next.model = 'Choose the model this agent runs on.'
    if (step === 'tools' && tools.length === 0) next.tools = 'Enable at least one tool, or this agent can only talk.'
    return next
  }

  if (created) {
    return (
      <p role="status" className="m-0 max-w-2xl text-sm text-ink-success">
        {name} was created. Start its first run from the agents list.
      </p>
    )
  }

  return (
    <Stepper
      label="Steps to create an agent"
      steps={STEPS}
      className="max-w-2xl"
      onStepSubmit={(step) => {
        const next = check(step)
        setErrors(next)
        return Object.keys(next).length === 0
      }}
      onComplete={() => setCreated(true)}
      messages={{ finish: 'Create agent' }}
    >
      {(step) => (
        <>
          <FormErrorSummary />
          {step.id === 'basics' ? (
            <>
              <Field label="Name" required error={errors.name} hint="Used in run ids: refund-reviewer-…">
                {(control) => <Input {...control} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}
              </Field>
              <Field label="What it is for" required error={errors.purpose}>
                {(control) => <Textarea {...control} rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} />}
              </Field>
            </>
          ) : null}
          {step.id === 'model' ? (
            <Field label="Model" required error={errors.model}>
              {(control) => <Select {...control} items={MODELS} value={model} onValueChange={setModel} placeholder="Choose a model" />}
            </Field>
          ) : null}
          {step.id === 'tools' ? (
            <CheckboxGroup legend="Tools" value={tools} onValueChange={setTools} error={errors.tools}>
              {TOOLS.map((tool) => (
                <Checkbox key={tool.value} value={tool.value} label={<span className="literal">{tool.value}</span>} description={tool.description} />
              ))}
            </CheckboxGroup>
          ) : null}
          {step.id === 'review' ? (
            <DescriptionList
              items={[
                { term: 'Name', detail: <span className="literal">{name}</span> },
                { term: 'What it is for', detail: purpose },
                { term: 'Model', detail: MODELS.find((m) => m.value === model)?.label ?? '—' },
                { term: 'Tools', detail: <span className="literal">{tools.join(', ')}</span> },
              ]}
            />
          ) : null}
        </>
      )}
    </Stepper>
  )
}

export const Default: Story = {
  render: () => <CreateAgent />,
  parameters: {
    docs: {
      description: {
        story:
          'Press **Continue** with the first step empty: the step stays, and focus goes to the summary of what to fix. Fill it in and Continue: focus moves to the next step’s heading, and Basics turns into a “Done” button you can go back to.',
      },
    },
  },
}

export const States: Story = {
  args: {
    defaultStep: 'tools',
    steps: STEPS.map((step) => (step.id === 'basics' ? { ...step, invalid: true } : step)),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Opened on the third step, with the first sent back by the server. Each state differs in the marker’s shape and in its word, not only its colour: Basics is a rojo “!” and “Needs fixing”, Model a verde check and “Done”, Tools the accent square and “Current”, Review a hollow square and “To do”.',
      },
    },
  },
}

export const Translated: Story = {
  args: {
    label: 'Pasos para crear un agente',
    lang: 'es',
    defaultStep: 'model',
    steps: [
      { id: 'basics', title: 'Datos básicos' },
      { id: 'model', title: 'Modelo' },
      { id: 'tools', title: 'Herramientas' },
    ],
    messages: {
      back: 'Atrás',
      continue: 'Continuar',
      finish: 'Crear agente',
      stepOf: (position: number, total: number) => `Paso ${position} de ${total}`,
      states: { upcoming: 'Pendiente', current: 'Actual', complete: 'Hecho', invalid: 'Por corregir' },
    },
    children: () => <p className="m-0 text-sm text-ink-2">Los campos del paso van aquí.</p>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Every word the stepper writes itself comes from `messages`: the buttons, the “Step 2 of 3” line and the four state words.',
      },
    },
  },
}
