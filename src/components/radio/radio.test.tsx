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

describe('Radio with a consumer aria-describedby', () => {
  it('adds the consumer description to its own instead of replacing it', () => {
    render(
      <>
        <RadioGroup label="On failure" description="Applies to every tool." aria-describedby="policy-note">
          <Radio value="retry" label="Retry" description="Up to three times." aria-describedby="retry-note" />
        </RadioGroup>
        <p id="retry-note">Counts against the budget.</p>
        <p id="policy-note">Set by the workspace owner.</p>
      </>,
    )
    expect(screen.getByRole('radio', { name: 'Retry' })).toHaveAccessibleDescription(
      'Up to three times. Counts against the budget.',
    )
    expect(screen.getByRole('radiogroup', { name: 'On failure' })).toHaveAccessibleDescription(
      'Applies to every tool. Set by the workspace owner.',
    )
  })
})
