import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Checkbox, CheckboxGroup } from '../checkbox'
import { Field, Input } from '../field'
import { Fieldset } from './fieldset'
import { Form } from './form'
import { FormErrorSummary } from './form-error-summary'

type Errors = Partial<Record<'name' | 'url' | 'events', string>>

function Webhook({ summary = true }: { summary?: boolean }) {
  const [errors, setErrors] = useState<Errors>({})
  const [events, setEvents] = useState<string[]>([])
  return (
    <Form
      aria-label="Webhook"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const next: Errors = {}
        if (!String(data.get('name') ?? '').trim()) next.name = 'Name the webhook.'
        if (!String(data.get('url') ?? '').startsWith('https://')) next.url = 'Use https.'
        if (events.length === 0) next.events = 'Choose at least one.'
        setErrors(next)
      }}
    >
      {summary ? <FormErrorSummary /> : null}
      <Field label="Name" error={errors.name}>
        {(control) => <Input {...control} name="name" />}
      </Field>
      <Field label="Endpoint" error={errors.url}>
        {(control) => <Input {...control} name="url" />}
      </Field>
      <CheckboxGroup legend="Events" value={events} onValueChange={setEvents} error={errors.events}>
        <Checkbox value="run.failed" label="run.failed" />
        <Checkbox value="run.succeeded" label="run.succeeded" />
      </CheckboxGroup>
      <button type="submit">Save</button>
    </Form>
  )
}

describe('Form with FormErrorSummary', () => {
  it('renders no summary while nothing is wrong', () => {
    render(<Webhook />)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('moves focus to the summary on the submit that finds errors, and names it by the count', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const summary = screen.getByRole('region', { name: '3 fields need fixing' })
    expect(summary).toHaveFocus()
  })

  it('also takes focus when Enter submits from a field', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('textbox', { name: 'Name' }))
    await user.keyboard('{Enter}')
    expect(screen.getByRole('region', { name: '3 fields need fixing' })).toHaveFocus()
  })

  it('takes focus again when a second submit finds the same errors', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('region', { name: '3 fields need fixing' })).toHaveFocus()
  })

  it('lists each error as “Label: message”, in document order, linked to its control', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Name: Name the webhook.',
      'Endpoint: Use https.',
      'Events: Choose at least one.',
    ])
    expect(links[0]).toHaveAttribute('href', `#${screen.getByRole('textbox', { name: 'Name' }).id}`)
  })

  it('moves focus to the control when a link is followed, with Enter', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.tab()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Endpoint: Use https.' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('textbox', { name: 'Endpoint' })).toHaveFocus()
  })

  it('focuses the first control of a group when the group’s link is followed', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('link', { name: 'Events: Choose at least one.' }))
    expect(screen.getByRole('checkbox', { name: 'run.failed' })).toHaveFocus()
  })

  it('announces once: the field errors are not alerts while a summary is mounted', async () => {
    const user = userEvent.setup()
    render(<Webhook />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    // The summary is not a live region either; the focus move is the announcement.
    const summary = screen.getByRole('region', { name: '3 fields need fixing' })
    expect(summary).not.toHaveAttribute('aria-live')
    // Each error still describes its control.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Name the webhook.')
    expect(screen.getByRole('group', { name: 'Events' })).toHaveAccessibleDescription('Choose at least one.')
  })

  it('shrinks as fields are fixed, without taking focus, and goes when the last is fixed', async () => {
    const user = userEvent.setup()
    function Live() {
      const [name, setName] = useState('')
      const error = name ? undefined : 'Name the webhook.'
      return (
        <Form aria-label="Live">
          <FormErrorSummary />
          <Field label="Name" error={error}>
            {(control) => <Input {...control} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Owner" error="Choose an owner.">
            {(control) => <Input {...control} />}
          </Field>
        </Form>
      )
    }
    render(<Live />)
    expect(screen.getByRole('region', { name: '2 fields need fixing' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'a')
    expect(screen.getByRole('region', { name: '1 field needs fixing' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
  })

  it('takes a title function and forwards ref and DOM props to its root', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLDivElement>()
    function Titled() {
      const [error, setError] = useState<string>()
      return (
        <Form aria-label="Titled" onSubmit={(e) => (e.preventDefault(), setError('Required.'))}>
          <FormErrorSummary ref={ref} data-testid="summary" title={(n) => `Hay ${n} problema`} headingLevel={3} />
          <Field label="Nombre" error={error}>
            {(control) => <Input {...control} />}
          </Field>
          <button type="submit">Guardar</button>
        </Form>
      )
    }
    render(<Titled />)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Hay 1 problema' })).toBeInTheDocument()
    expect(ref.current).toBe(screen.getByTestId('summary'))
    expect(ref.current).toHaveFocus()
  })
})

describe('Form without a summary', () => {
  it('moves focus to the first invalid control in document order, and keeps the field alerts', async () => {
    const user = userEvent.setup()
    render(<Webhook summary={false} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    expect(screen.getAllByRole('alert')).toHaveLength(3)
  })

  it('leaves focus alone when the submit finds nothing wrong', async () => {
    const user = userEvent.setup()
    function Valid() {
      return (
        <Form aria-label="Valid" onSubmit={(e) => e.preventDefault()}>
          <Field label="Name">{(control) => <Input {...control} />}</Field>
          <button type="submit">Save</button>
        </Form>
      )
    }
    render(<Valid />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
  })

  it('renders a real form and forwards ref, className and DOM props to it', () => {
    const ref = createRef<HTMLFormElement>()
    render(<Form ref={ref} aria-label="Plain" className="gap-4" data-testid="f" />)
    const form = screen.getByRole('form', { name: 'Plain' })
    expect(ref.current).toBe(form)
    expect(form).toHaveClass('gap-4')
    expect(form).toHaveAttribute('data-slot', 'form')
    expect(form).toHaveAttribute('novalidate')
  })
})

describe('Fieldset', () => {
  it('is a group named by its legend and described by its description and error', () => {
    render(
      <Fieldset legend="Retry delays" description="Five retries." error="The last must be longer.">
        <input aria-label="First" />
      </Fieldset>,
    )
    const group = screen.getByRole('group', { name: 'Retry delays' })
    expect(group.tagName).toBe('FIELDSET')
    expect(group).toHaveAccessibleDescription('Five retries. The last must be longer.')
    expect(group).toHaveAttribute('data-invalid')
    // Outside a form with a summary, the group's error is the announcement.
    expect(screen.getByRole('alert')).toHaveTextContent('The last must be longer.')
  })

  it('disables the controls inside it and keeps them out of the tab order', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Fieldset legend="Legacy limits" disabled>
          <Field label="Requests per minute">{(control) => <Input {...control} />}</Field>
        </Fieldset>
        <button type="button">After</button>
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Requests per minute' })).toBeDisabled()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })
})
