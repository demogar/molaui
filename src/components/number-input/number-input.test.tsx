import { DirectionProvider } from '@base-ui/react/direction-provider'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { NumberInput } from './number-input'

describe('NumberInput', () => {
  it('is named by Field, described by its hint and unit, and marked invalid', () => {
    render(
      <Field label="Token budget" hint="Per run." error="Too low.">
        {(control) => <NumberInput {...control} unit="tokens" defaultValue={100} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Token budget' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Per run. Too low. tokens')
  })

  it('formats the value with Intl for the given locale', () => {
    render(<NumberInput aria-label="Budget" locale="en-US" defaultValue={12000} />)
    expect(screen.getByRole('textbox')).toHaveValue('12,000')
  })

  it('formats for another locale, with no hidden en-US default', () => {
    render(<NumberInput aria-label="Presupuesto" locale="de-DE" defaultValue={1500.5} />)
    expect(screen.getByRole('textbox')).toHaveValue('1.500,5')
  })

  it('steps with the arrow keys, Shift for the large step, and clamps to the bounds', async () => {
    const onValueChange = vi.fn()
    render(<NumberInput aria-label="Retries" min={0} max={20} defaultValue={3} onValueChange={onValueChange} />)
    screen.getByRole('textbox').focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(onValueChange).toHaveBeenLastCalledWith(4)
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(onValueChange).toHaveBeenLastCalledWith(14)
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(onValueChange).toHaveBeenLastCalledWith(20)
    await userEvent.keyboard('{ArrowDown}')
    expect(onValueChange).toHaveBeenLastCalledWith(19)
  })

  it('jumps to the bounds with Home and End', async () => {
    const onValueChange = vi.fn()
    render(<NumberInput aria-label="Retries" min={1} max={9} defaultValue={3} onValueChange={onValueChange} />)
    screen.getByRole('textbox').focus()
    await userEvent.keyboard('{End}')
    expect(onValueChange).toHaveBeenLastCalledWith(9)
    await userEvent.keyboard('{Home}')
    expect(onValueChange).toHaveBeenLastCalledWith(1)
  })

  it('steps by largeStep with PageUp and PageDown, within the bounds', async () => {
    const onValueChange = vi.fn()
    render(
      <NumberInput aria-label="Timeout" min={0} max={120} largeStep={30} defaultValue={100} onValueChange={onValueChange} />,
    )
    const input = screen.getByRole('textbox')
    input.focus()
    await userEvent.keyboard('{PageDown}')
    expect(onValueChange).toHaveBeenLastCalledWith(70)
    expect(input).toHaveValue('70')
    await userEvent.keyboard('{PageUp}{PageUp}')
    expect(onValueChange).toHaveBeenLastCalledWith(120)
  })

  it('rounds PageUp on fractional steps', async () => {
    const onValueChange = vi.fn()
    render(<NumberInput aria-label="Temperature" step={0.1} largeStep={0.1} defaultValue={0.2} onValueChange={onValueChange} />)
    screen.getByRole('textbox').focus()
    await userEvent.keyboard('{PageUp}')
    expect(onValueChange).toHaveBeenLastCalledWith(0.3)
  })

  it('steps with the buttons and disables the one at a bound', async () => {
    const onValueChange = vi.fn()
    render(<NumberInput aria-label="Workers" min={1} max={4} defaultValue={3} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onValueChange).toHaveBeenLastCalledWith(4)
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease' })).not.toBeDisabled()
  })

  it('parses typed text on blur', async () => {
    const onValueChange = vi.fn()
    render(<NumberInput aria-label="Budget" locale="en-US" onValueChange={onValueChange} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, '2500')
    await userEvent.tab()
    expect(onValueChange).toHaveBeenLastCalledWith(2500)
    expect(input).toHaveValue('2,500')
  })

  it('changes on the wheel only when allowWheelScrub is set', () => {
    const onValueChange = vi.fn()
    const { unmount } = render(<NumberInput aria-label="A" defaultValue={5} onValueChange={onValueChange} />)
    const input = screen.getByRole('textbox')
    input.focus()
    fireEvent.wheel(input, { deltaY: -100 })
    expect(onValueChange).not.toHaveBeenCalled()
    unmount()

    render(<NumberInput aria-label="B" defaultValue={5} allowWheelScrub onValueChange={onValueChange} />)
    const scrubbable = screen.getByRole('textbox')
    scrubbable.focus()
    fireEvent.pointerEnter(scrubbable)
    fireEvent.wheel(scrubbable, { deltaY: -100 })
    expect(onValueChange).toHaveBeenLastCalledWith(6)
  })

  it('keeps ArrowUp as increase in right-to-left', async () => {
    const onValueChange = vi.fn()
    render(
      <DirectionProvider direction="rtl">
        <NumberInput aria-label="عدد" locale="ar-EG" defaultValue={5} onValueChange={onValueChange} />
      </DirectionProvider>,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('٥')
    input.focus()
    await userEvent.keyboard('{ArrowUp}{PageUp}')
    expect(onValueChange).toHaveBeenLastCalledWith(16)
  })

  it('ignores PageUp when read-only', async () => {
    const onValueChange = vi.fn()
    render(<NumberInput aria-label="Locked" readOnly defaultValue={5} onValueChange={onValueChange} />)
    screen.getByRole('textbox').focus()
    await userEvent.keyboard('{PageUp}')
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
