import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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

  it('does not toggle when disabled', async () => {
    render(<Switch label="Locked" disabled />)
    await userEvent.click(screen.getByText('Locked'))
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})
