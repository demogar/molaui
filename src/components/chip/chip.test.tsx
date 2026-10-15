import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Chip, ChipGroup } from './chip'

describe('Chip', () => {
  it('is a real checkbox named by its label', async () => {
    render(<Chip>Failed</Chip>)
    const box = screen.getByRole('checkbox', { name: 'Failed' })
    await userEvent.click(screen.getByText('Failed'))
    expect(box).toBeChecked()
  })

  it('works as a radio set with arrow keys', async () => {
    render(
      <ChipGroup legend="Range">
        <Chip type="radio" name="r" value="1h" defaultChecked>
          1h
        </Chip>
        <Chip type="radio" name="r" value="24h">
          24h
        </Chip>
      </ChipGroup>,
    )
    expect(screen.getByRole('group', { name: 'Range' })).toBeInTheDocument()
    screen.getByRole('radio', { name: '1h' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '24h' })).toBeChecked()
  })

  it('includes the count in the name, so the number is not lost to a screen reader', () => {
    render(<Chip count={12}>Failed</Chip>)
    expect(screen.getByRole('checkbox', { name: 'Failed 12' })).toBeInTheDocument()
  })

  it('keeps a visually hidden legend for assistive technology', () => {
    render(
      <ChipGroup legend="Status" hideLegend>
        <Chip>Running</Chip>
      </ChipGroup>,
    )
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument()
  })
})

describe('Chip keyboard', () => {
  it('takes focus with Tab and toggles a checkbox chip with Space', async () => {
    const user = userEvent.setup()
    render(<Chip>Failed</Chip>)
    await user.tab()
    const box = screen.getByRole('checkbox', { name: 'Failed' })
    expect(box).toHaveFocus()
    await user.keyboard(' ')
    expect(box).toBeChecked()
    await user.keyboard(' ')
    expect(box).not.toBeChecked()
  })

  it('enters a radio set at its checked chip, and arrows move and check in both directions', async () => {
    const user = userEvent.setup()
    render(
      <ChipGroup legend="Range">
        <Chip type="radio" name="r" value="1h">
          1h
        </Chip>
        <Chip type="radio" name="r" value="24h" defaultChecked>
          24h
        </Chip>
        <Chip type="radio" name="r" value="7d">
          7d
        </Chip>
      </ChipGroup>,
    )
    await user.tab()
    expect(screen.getByRole('radio', { name: '24h' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: '7d' })).toBeChecked()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: '24h' })).toBeChecked()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: '1h' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '1h' })).toHaveFocus()
  })

  it('checks an unchecked radio chip with Space', async () => {
    const user = userEvent.setup()
    render(
      <ChipGroup legend="Range">
        <Chip type="radio" name="r" value="1h">
          1h
        </Chip>
      </ChipGroup>,
    )
    await user.tab()
    await user.keyboard(' ')
    expect(screen.getByRole('radio', { name: '1h' })).toBeChecked()
  })
})
