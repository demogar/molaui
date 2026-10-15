import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { Select } from './select'

const items = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'preview', label: 'Preview', disabled: true },
]

describe('Select', () => {
  it.each([
    ['Enter', () => userEvent.keyboard('{Enter}')],
    ['Space', () => userEvent.keyboard(' ')],
    ['ArrowDown', () => userEvent.keyboard('{ArrowDown}')],
    ['ArrowUp', () => userEvent.keyboard('{ArrowUp}')],
  ])('opens from its trigger with %s and stays open', async (_name, press) => {
    render(<Select label="Environment" items={items} />)
    const trigger = screen.getByRole('combobox', { name: /Environment/ })
    trigger.focus()
    await press()
    const listbox = await screen.findByRole('listbox')
    // Past the keystroke, so a popup that opened and was dismissed by the same key would show.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(listbox).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('is reached with Tab; arrows, Home and End move the highlight, Enter chooses and closes', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const many = [
      { value: 'production', label: 'Production' },
      { value: 'staging', label: 'Staging' },
      { value: 'canary', label: 'Canary' },
    ]
    render(<Select label="Environment" items={many} onValueChange={onValueChange} />)
    await user.tab()
    const trigger = screen.getByRole('combobox', { name: /Environment/ })
    expect(trigger).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    await screen.findByRole('listbox')
    const highlighted = () => screen.getAllByRole('option').find((o) => o.hasAttribute('data-highlighted'))?.textContent
    await waitFor(() => expect(highlighted()).toBe('Production'))
    await user.keyboard('{ArrowDown}')
    expect(highlighted()).toBe('Staging')
    await user.keyboard('{ArrowUp}')
    expect(highlighted()).toBe('Production')
    await user.keyboard('{End}')
    expect(highlighted()).toBe('Canary')
    await user.keyboard('{Home}')
    expect(highlighted()).toBe('Production')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('staging')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
    expect(trigger).toHaveTextContent('Staging')
  })

  it('chooses the highlighted option with Space, and Escape closes without changing the value', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Environment" items={items} defaultValue="production" onValueChange={onValueChange} />)
    const trigger = screen.getByRole('combobox', { name: /Environment/ })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger).toHaveTextContent('Production')
    await user.keyboard('{ArrowDown}')
    await screen.findByRole('listbox')
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Production' })).toHaveAttribute('data-highlighted'),
    )
    await user.keyboard('{ArrowDown}')
    // Past the keystroke that opened it, so Space is not swallowed as the opening press.
    await new Promise((resolve) => setTimeout(resolve, 100))
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenLastCalledWith('staging')
  })

  it('is named by its visible label and shows the current value', () => {
    render(<Select label="Environment" items={items} defaultValue="staging" />)
    const trigger = screen.getByRole('combobox', { name: /Environment/ })
    expect(trigger).toHaveTextContent('Staging')
  })

  it('opens, lists the options, and reports the chosen value', async () => {
    const onValueChange = vi.fn()
    render(<Select label="Environment" items={items} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Production', 'Staging', 'Preview'])
    await userEvent.click(screen.getByRole('option', { name: 'Production' }))
    expect(onValueChange).toHaveBeenCalledWith('production')
  })

  it('takes Field wiring: name, description and invalid state', () => {
    render(
      <Field label="Region" hint="Where it runs." error="Required.">
        {(control) => <Select {...control} items={items} />}
      </Field>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Region' })
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAccessibleDescription('Where it runs. Required.')
  })

  // The listbox Base UI opens has no name of its own; a screen reader moving
  // into the options would hear only "listbox" (#142).
  it.each([
    ['its own label', <Select key="a" label="Environment" required items={items} />],
    [
      'a Field',
      <Field key="b" label="Environment">
        {(control) => <Select {...control} items={items} />}
      </Field>,
    ],
    ['aria-label on the trigger', <Select key="c" aria-label="Environment" items={items} />],
    [
      'a hand-written label without an id',
      <div key="d">
        <label htmlFor="env">Environment</label>
        <Select id="env" items={items} />
      </div>,
    ],
  ])('names its listbox after %s', async (_how, ui) => {
    render(ui)
    await userEvent.click(screen.getByRole('combobox', { name: 'Environment' }))
    expect(await screen.findByRole('listbox', { name: 'Environment' })).toBeInTheDocument()
  })

  it('renders group labels for grouped items', async () => {
    render(
      <Select
        aria-label="Model"
        items={[
          { label: 'Fast', items: [{ value: 'a', label: 'Alpha' }] },
          { label: 'Deep', items: [{ value: 'b', label: 'Beta' }] },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Fast')).toBeInTheDocument()
    expect(screen.getByText('Deep')).toBeInTheDocument()
  })
})
