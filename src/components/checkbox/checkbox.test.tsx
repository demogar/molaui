import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Checkbox, CheckboxGroup } from './checkbox'

describe('Checkbox', () => {
  it('is named by its label alone, and described by its description', () => {
    render(<Checkbox label="Retry" description="Up to three times." />)
    const box = screen.getByRole('checkbox', { name: 'Retry' })
    expect(box).toHaveAccessibleDescription('Up to three times.')
  })

  it('toggles from the label and from the keyboard', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Stream" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByText('Stream'))
    expect(screen.getByRole('checkbox')).toBeChecked()
    screen.getByRole('checkbox').focus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
  })

  it('reports the indeterminate state as mixed', () => {
    render(<Checkbox label="All" indeterminate />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
  })
})

describe('CheckboxGroup', () => {
  it('is a named group whose value is the checked options', async () => {
    const onValueChange = vi.fn()
    render(
      <CheckboxGroup legend="Tools" defaultValue={['a']} onValueChange={onValueChange}>
        <Checkbox value="a" label="Alpha" />
        <Checkbox value="b" label="Beta" />
      </CheckboxGroup>,
    )
    expect(screen.getByRole('group', { name: 'Tools' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Beta' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b'], expect.anything())
  })
})
