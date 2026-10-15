import { render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Field, Input } from '../field'
import { FormErrorSummary } from '../form'
import { Stepper, type StepperStep } from './stepper'

const STEPS: StepperStep[] = [
  { id: 'basics', title: 'Basics' },
  { id: 'model', title: 'Model' },
  { id: 'review', title: 'Review' },
]

function Wizard({ onComplete = () => {} }: { onComplete?: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  return (
    <Stepper
      label="Steps to create an agent"
      steps={STEPS}
      onStepSubmit={(step) => {
        if (step !== 'basics') return
        const next = name ? undefined : 'Name the agent.'
        setError(next)
        return !next
      }}
      onComplete={onComplete}
    >
      {(step) =>
        step.id === 'basics' ? (
          <>
            <FormErrorSummary />
            <Field label="Name" error={error}>
              {(control) => <Input {...control} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
          </>
        ) : (
          <p>{step.id} content</p>
        )
      }
    </Stepper>
  )
}

const steps = () => within(screen.getByRole('navigation')).getAllByRole('listitem')

describe('Stepper', () => {
  it('names the step list and marks the current step with aria-current="step"', () => {
    render(<Wizard />)
    const items = steps()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveAttribute('aria-current', 'step')
    expect(items[1]).not.toHaveAttribute('aria-current')
  })

  it('states each step in a word, not only a colour', () => {
    render(<Stepper label="Steps" steps={STEPS.map((s, i) => (i === 0 ? { ...s, invalid: true } : s))} defaultStep="model">{() => null}</Stepper>)
    const items = steps()
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual(['invalid', 'current', 'upcoming'])
    expect(items[0]).toHaveTextContent('Needs fixing')
    expect(items[1]).toHaveTextContent('Current')
    expect(items[2]).toHaveTextContent('To do')
  })

  it('does not take focus on first render', () => {
    render(<Wizard />)
    expect(document.body).toHaveFocus()
  })

  it('stays on a step that fails, and sends focus to its error summary', async () => {
    const user = userEvent.setup()
    render(<Wizard />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '1 field needs fixing' })).toHaveFocus()
  })

  it('moves on with Enter in a field, and focuses the new step’s heading', async () => {
    const user = userEvent.setup()
    render(<Wizard />)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'refund-reviewer{Enter}')
    const heading = screen.getByRole('heading', { name: 'Model' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(steps()[0]).toHaveTextContent('Done')
  })

  it('goes back with Back, and to a reached step from the list with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Wizard />)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'a{Enter}')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Review' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Model' })).toHaveFocus()

    // Basics is done, so it is a button; Review was reached, so it is one too.
    const basics = screen.getByRole('button', { name: 'Basics Done' })
    expect(screen.getByRole('button', { name: 'Review To do' })).toBeInTheDocument()
    basics.focus()
    await user.keyboard(' ')
    expect(screen.getByRole('heading', { name: 'Basics' })).toHaveFocus()
    screen.getByRole('button', { name: 'Model Done' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Model' })).toHaveFocus()
  })

  it('does not make steps beyond the furthest reached into buttons', () => {
    render(<Wizard />)
    expect(screen.queryByRole('button', { name: /Model/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Review/ })).not.toBeInTheDocument()
  })

  it('reaches the step list and the panel controls with Tab, in order', async () => {
    const user = userEvent.setup()
    render(<Stepper label="Steps" steps={STEPS} defaultStep="model">{() => <input aria-label="Model name" />}</Stepper>)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Basics Done' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Model name' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
  })

  it('calls onComplete after the last step passes, and labels its button Finish', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Stepper label="Steps" steps={STEPS} defaultStep="review" onComplete={onComplete}>{() => null}</Stepper>)
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('waits for a promise from onStepSubmit, showing Continue as busy', async () => {
    const user = userEvent.setup()
    let resolve: (ok: boolean) => void = () => {}
    render(
      <Stepper label="Steps" steps={STEPS} onStepSubmit={() => new Promise<boolean>((r) => (resolve = r))}>
        {() => null}
      </Stepper>,
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveAttribute('aria-busy', 'true')
    resolve(true)
    expect(await screen.findByRole('heading', { name: 'Model' })).toHaveFocus()
  })

  it('is controllable: reports the step and follows the parent', async () => {
    const user = userEvent.setup()
    const onStepChange = vi.fn()
    function Controlled() {
      const [step, setStep] = useState('basics')
      return (
        <>
          <Stepper label="Steps" steps={STEPS} step={step} onStepChange={(s) => (onStepChange(s), setStep(s))}>
            {() => null}
          </Stepper>
          <button type="button" onClick={() => setStep('review')}>
            Jump
          </button>
        </>
      )
    }
    render(<Controlled />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onStepChange).toHaveBeenCalledWith('model')
    await user.click(screen.getByRole('button', { name: 'Jump' }))
    expect(screen.getByRole('heading', { name: 'Review' })).toHaveFocus()
  })

  it('takes messages for every word it writes', () => {
    render(
      <Stepper
        label="Pasos"
        steps={STEPS}
        defaultStep="model"
        messages={{ back: 'Atrás', continue: 'Continuar', stepOf: 'Paso {position} de {total}', states: { complete: 'Hecho' } }}
      >
        {() => null}
      </Stepper>,
    )
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument()
    expect(steps()[0]).toHaveTextContent('Hecho')
    expect(steps()[2]).toHaveTextContent('To do')
  })

  it('forwards ref, className and DOM props to its root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Stepper ref={ref} label="Steps" steps={STEPS} className="max-w-xl" data-testid="s">{() => null}</Stepper>)
    expect(ref.current).toBe(screen.getByTestId('s'))
    expect(ref.current).toHaveClass('max-w-xl')
    expect(ref.current).toHaveAttribute('data-slot', 'stepper')
  })
})
