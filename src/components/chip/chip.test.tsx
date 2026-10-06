import { render, screen } from '@testing-library/react'
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
