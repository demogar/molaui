import { render, screen } from '@testing-library/react'
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
