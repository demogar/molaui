import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { Switch } from './switch'

describe('Switch', () => {
  it('is a named switch with its description', () => {
    render(<Switch label="Stream responses" description="Tokens as they arrive." />)
    const control = screen.getByRole('switch', { name: 'Stream responses' })
    expect(control).toHaveAccessibleDescription('Tokens as they arrive.')
  })

  it('toggles from the label and the keyboard', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch label="Web search" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByText('Web search'))
    expect(screen.getByRole('switch')).toBeChecked()
    screen.getByRole('switch').focus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
  })

  it('is reached with Tab and turns on and off with Enter', async () => {
    const user = userEvent.setup()
    render(<Switch label="Web search" />)
    await user.tab()
    const control = screen.getByRole('switch', { name: 'Web search' })
    expect(control).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(control).toBeChecked()
    await user.keyboard('{Enter}')
    expect(control).not.toBeChecked()
  })

  it('does not toggle when disabled', async () => {
    render(<Switch label="Locked" disabled />)
    await userEvent.click(screen.getByText('Locked'))
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})

describe('Switch inside Field', () => {
  it("adds Field's hint to its own description instead of replacing it", () => {
    render(
      <Field label="Output" hint="Off for batch runs.">
        {(control) => <Switch {...control} label="Stream responses" description="Tokens as they arrive." />}
      </Field>,
    )
    expect(screen.getByRole('switch', { name: 'Output' })).toHaveAccessibleDescription(
      'Tokens as they arrive. Off for batch runs.',
    )
  })
})
