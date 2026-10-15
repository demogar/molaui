import { render, screen } from '@/test/render'
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

  it('is one tab stop at the checked radio; arrows move and check, wrapping; Space checks', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Group />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Retry' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Skip' })).toBeChecked()
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowRight}')
    // Wraps from the last radio back to the first.
    expect(screen.getByRole('radio', { name: 'Retry' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Retry' })).toBeChecked()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: 'Halt' })).toBeChecked()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Skip' })).toBeChecked()
    await user.keyboard(' ')
    expect(screen.getByRole('radio', { name: 'Skip' })).toBeChecked()
    // Tab again leaves the group rather than visiting the other radios.
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
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
