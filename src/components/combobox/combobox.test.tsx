import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { Autocomplete, Combobox } from './combobox'

const reviewers = [
  { value: 'ana', label: 'Ana Ríos', description: 'Evaluation' },
  { value: 'bruno', label: 'Bruno Vega', description: 'Platform' },
  { value: 'carla', label: 'Carla Pinzón', description: 'Evaluation' },
  { value: 'diego', label: 'Diego Mora', description: 'Retired', disabled: true },
]

describe('Combobox', () => {
  it('is named by Field and takes its description and invalid state', () => {
    render(
      <Field label="Reviewer" hint="They approve the run." error="Choose a reviewer.">
        {(control) => <Combobox {...control} items={reviewers} />}
      </Field>,
    )
    const input = screen.getByRole('combobox', { name: 'Reviewer' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('They approve the run. Choose a reviewer.')
  })

  it('filters as you type and commits the highlighted option with Enter', async () => {
    const onValueChange = vi.fn()
    render(<Combobox label="Reviewer" items={reviewers} onValueChange={onValueChange} />)
    const input = screen.getByRole('combobox', { name: 'Reviewer' })
    await userEvent.type(input, 'car')
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Carla PinzónEvaluation'])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('carla')
    expect(input).toHaveValue('Carla Pinzón')
  })

  it('shows the label of a controlled value', () => {
    render(<Combobox aria-label="Reviewer" items={reviewers} value="bruno" />)
    expect(screen.getByRole('combobox', { name: 'Reviewer' })).toHaveValue('Bruno Vega')
  })

  it('opens with ArrowDown and skips disabled options', async () => {
    render(<Combobox aria-label="Reviewer" items={reviewers} />)
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{ArrowDown}')
    const disabled = await screen.findByRole('option', { name: /Diego Mora/ })
    expect(disabled).toHaveAttribute('aria-disabled', 'true')
  })

  it('says "No matches" when the filter empties the list', async () => {
    render(<Combobox aria-label="Reviewer" items={reviewers} />)
    await userEvent.type(screen.getByRole('combobox'), 'zzz')
    expect(await screen.findByText('No matches')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('announces loading in a status region instead of "No matches"', async () => {
    render(<Combobox aria-label="Reviewer" items={[]} filter={null} loading />)
    await userEvent.type(screen.getByRole('combobox'), 'an')
    const statuses = await screen.findAllByRole('status')
    expect(statuses.some((s) => s.textContent?.includes('Searching…'))).toBe(true)
    expect(screen.queryByText('No matches')).not.toBeInTheDocument()
  })

  it('reports each keystroke for a server search', async () => {
    const onInputValueChange = vi.fn()
    render(<Combobox aria-label="Reviewer" items={[]} filter={null} onInputValueChange={onInputValueChange} />)
    await userEvent.type(screen.getByRole('combobox'), 'br')
    expect(onInputValueChange).toHaveBeenLastCalledWith('br')
  })

  it('renders labelled groups', async () => {
    render(
      <Combobox
        aria-label="Tool"
        items={[
          { label: 'Retrieval', items: [{ value: 'search_docs', label: 'search_docs' }] },
          { label: 'Actions', items: [{ value: 'open_ticket', label: 'open_ticket' }] },
        ]}
      />,
    )
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{ArrowDown}')
    const groups = within(await screen.findByRole('listbox')).getAllByRole('group')
    expect(groups.map((g) => within(g).getAllByRole('option')[0]?.textContent)).toEqual(['search_docs', 'open_ticket'])
    expect(groups[0]).toHaveAccessibleName('Retrieval')
  })

  it('clears the selection with the clear button', async () => {
    const onValueChange = vi.fn()
    render(<Combobox aria-label="Reviewer" items={reviewers} defaultValue="ana" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  describe('multiple', () => {
    it('adds chips, removes one by its button, and reports the values', async () => {
      const onValueChange = vi.fn()
      render(<Combobox multiple label="Reviewers" items={reviewers} onValueChange={onValueChange} />)
      const input = screen.getByRole('combobox', { name: 'Reviewers' })
      await userEvent.type(input, 'ana')
      await userEvent.keyboard('{ArrowDown}{Enter}')
      await userEvent.type(input, 'bru')
      await userEvent.keyboard('{ArrowDown}{Enter}')
      expect(onValueChange).toHaveBeenLastCalledWith(['ana', 'bruno'])
      const chips = screen.getByRole('toolbar', { name: 'Selected' })
      expect(within(chips).getByText('Ana Ríos')).toBeInTheDocument()
      expect(input).toHaveAccessibleDescription(/2 selected\. Press Left Arrow/)

      await userEvent.click(screen.getByRole('button', { name: 'Remove Ana Ríos' }))
      expect(onValueChange).toHaveBeenLastCalledWith(['bruno'])
    })

    it('removes the last chip with Backspace from an empty input', async () => {
      const onValueChange = vi.fn()
      render(
        <Combobox multiple aria-label="Reviewers" items={reviewers} defaultValue={['ana', 'carla']} onValueChange={onValueChange} />,
      )
      screen.getByRole('combobox').focus()
      await userEvent.keyboard('{Backspace}')
      expect(onValueChange).toHaveBeenLastCalledWith(['ana'])
    })

    it('reaches the chips with ArrowLeft and removes the focused one with Backspace', async () => {
      const onValueChange = vi.fn()
      render(
        <Combobox multiple aria-label="Reviewers" items={reviewers} defaultValue={['ana', 'carla']} onValueChange={onValueChange} />,
      )
      screen.getByRole('combobox').focus()
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(screen.getByLabelText('Ana Ríos')).toHaveFocus()
      await userEvent.keyboard('{Backspace}')
      expect(onValueChange).toHaveBeenLastCalledWith(['carla'])
    })

    it('mirrors the chip key in right-to-left: ArrowRight reaches the chips, and the hint says so', async () => {
      const onValueChange = vi.fn()
      render(
        <DirectionProvider direction="rtl">
          <Combobox multiple aria-label="Reviewers" items={reviewers} defaultValue={['ana', 'carla']} onValueChange={onValueChange} />
        </DirectionProvider>,
      )
      const input = screen.getByRole('combobox')
      expect(input).toHaveAccessibleDescription(/Press Right Arrow/)
      input.focus()
      await userEvent.keyboard('{ArrowRight}')
      expect(screen.getByLabelText('Carla Pinzón')).toHaveFocus()
      await userEvent.keyboard('{Backspace}')
      expect(onValueChange).toHaveBeenLastCalledWith(['ana'])
    })
  })
})

describe('Autocomplete', () => {
  const tags = ['regression', 'retrieval', 'red-team', 'latency']

  it('keeps free text as the value', async () => {
    const onValueChange = vi.fn()
    render(<Autocomplete label="Run label" items={tags} onValueChange={onValueChange} />)
    const input = screen.getByRole('combobox', { name: 'Run label' })
    await userEvent.type(input, 'nightly-eval')
    expect(onValueChange).toHaveBeenLastCalledWith('nightly-eval')
    expect(input).toHaveValue('nightly-eval')
  })

  it('fills the text from a suggestion with the keyboard', async () => {
    render(<Autocomplete aria-label="Run label" items={tags} />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 're')
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual(['regression', 'retrieval', 'red-team'])
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(input).toHaveValue('retrieval')
  })

  it('takes Field wiring', () => {
    render(
      <Field label="Tag" error="Use lowercase.">
        {(control) => <Autocomplete {...control} items={tags} />}
      </Field>,
    )
    expect(screen.getByRole('combobox', { name: 'Tag' })).toHaveAttribute('aria-invalid', 'true')
  })
})
