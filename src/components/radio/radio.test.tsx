import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Radio, RadioGroup } from './radio'

function Group() {
  return (
    <RadioGroup label="On failure" description="Applies to every tool." defaultValue="retry">
      <Radio value="retry" label="Retry" />
      <Radio value="skip" label="Skip" />
      <Radio value="halt" label="Halt" />
    </RadioGroup>
  )
}

describe('RadioGroup', () => {
  it('is a named, described radiogroup — square on screen, radios to a screen reader', () => {
    render(<Group />)
    const group = screen.getByRole('radiogroup', { name: 'On failure' })
    expect(group).toHaveAccessibleDescription('Applies to every tool.')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Retry' })).toBeChecked()
  })

  it('moves the choice with the arrow keys', async () => {
    render(<Group />)
    screen.getByRole('radio', { name: 'Retry' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Skip' })).toBeChecked()
  })

  it('selects from the label text', async () => {
    render(<Group />)
    await userEvent.click(screen.getByText('Halt'))
    expect(screen.getByRole('radio', { name: 'Halt' })).toBeChecked()
  })
})
