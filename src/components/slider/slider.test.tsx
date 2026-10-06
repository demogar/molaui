import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Slider } from './slider'

describe('Slider', () => {
  it('is a named range input that prints its value', () => {
    render(<Slider label="Temperature" defaultValue={0.7} min={0} max={1} step={0.05} />)
    const input = screen.getByRole('slider', { name: 'Temperature' })
    expect(input).toHaveAttribute('aria-valuenow', '0.7')
    expect(screen.getByText('0.7')).toBeInTheDocument()
  })

  it('steps with the arrow keys', async () => {
    const onValueChange = vi.fn()
    render(<Slider label="Rollout" defaultValue={20} min={0} max={100} step={5} onValueChange={onValueChange} />)
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onValueChange).toHaveBeenCalledWith(25, expect.anything())
  })

  it('reverses the arrow keys right-to-left, where the track fills from the right', async () => {
    const onValueChange = vi.fn()
    render(
      <DirectionProvider direction="rtl">
        <Slider label="Rollout" defaultValue={20} min={0} max={100} step={5} onValueChange={onValueChange} />
      </DirectionProvider>,
    )
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onValueChange).toHaveBeenCalledWith(25, expect.anything())
  })

  it('renders one thumb per value for a range', () => {
    render(<Slider label="Band" defaultValue={[1200, 1800]} min={400} max={3000} />)
    expect(screen.getAllByRole('slider')).toHaveLength(2)
  })
})
