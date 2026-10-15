import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
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

describe('Checkbox inside Field', () => {
  it("adds Field's hint to its own description instead of replacing it", () => {
    render(
      <Field label="Policy" hint="Applies to every tool.">
        {(control) => <Checkbox {...control} label="Retry" description="Up to three times." />}
      </Field>,
    )
    expect(screen.getByRole('checkbox', { name: 'Policy' })).toHaveAccessibleDescription(
      'Up to three times. Applies to every tool.',
    )
  })

  it('keeps its own description when Field has no hint to add', () => {
    render(<Field label="Policy">{(control) => <Checkbox {...control} label="Retry" description="Up to three times." />}</Field>)
    expect(screen.getByRole('checkbox', { name: 'Policy' })).toHaveAccessibleDescription('Up to three times.')
  })
})

describe('Checkbox keyboard', () => {
  it('takes focus with Tab, toggles with Space and not with Enter', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Stream" />)
    await user.tab()
    const box = screen.getByRole('checkbox', { name: 'Stream' })
    expect(box).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(box).not.toBeChecked()
    await user.keyboard(' ')
    expect(box).toBeChecked()
  })
})
