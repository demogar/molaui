import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { DateTimePicker } from './date-time-picker'
import { TimePicker } from './time-picker'
import { formatTime, getTimeLayout, parseTime } from './time-utils'

// Tuesday 6 October 2026, at local midnight. Every test pins "now".
const TODAY = new Date(2026, 9, 6)

describe('time utilities', () => {
  it('reads the clock, the order and the day-period words from Intl', () => {
    expect(getTimeLayout('en-US')).toMatchObject({ order: ['hour', 'minute', 'dayPeriod'], hourCycle: 'h12', padHour: false })
    expect(getTimeLayout('en-GB')).toMatchObject({ order: ['hour', 'minute'], hourCycle: 'h23', padHour: true })
    expect(getTimeLayout('ko-KR').order).toEqual(['dayPeriod', 'hour', 'minute'])
    expect(getTimeLayout('fi-FI').literals).toEqual(['', '.', ''])
    expect(getTimeLayout('es-PA').dayPeriods.map((word) => word.replace(/\s/g, ' '))).toEqual(['a. m.', 'p. m.'])
    expect(getTimeLayout('en-GB', 12).hourCycle).toBe('h12')
  })

  it('parses HH:mm and refuses anything else', () => {
    expect(parseTime('09:30')).toEqual({ hour: 9, minute: 30 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('9.30')).toBeNull()
    expect(formatTime({ hour: 21, minute: 5 }, 'en-US')).toBe('9:05 PM')
  })
})

function renderTime(props: Partial<React.ComponentProps<typeof TimePicker>> = {}) {
  const onValueChange = vi.fn()
  render(
    <>
      <Field label="Run at">{(control) => <TimePicker {...control} locale="en-US" onValueChange={onValueChange} {...props} />}</Field>
      <button type="button">After</button>
    </>,
  )
  return onValueChange
}

const segment = (name: RegExp | string) => screen.getByRole('spinbutton', { name })

describe('TimePicker', () => {
  it('is a group named by its label, with one spinbutton per segment named by the label and its word', () => {
    renderTime({ defaultValue: '21:05' })
    expect(screen.getByRole('group', { name: 'Run at' })).toBeInTheDocument()
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuetext', '9')
    expect(segment('Run at Minute')).toHaveAttribute('aria-valuenow', '5')
    expect(segment('Run at AM/PM')).toHaveAttribute('aria-valuetext', 'PM')
  })

  it('focuses the first segment from the label, and an empty segment says so', async () => {
    const user = userEvent.setup()
    renderTime()
    await user.click(screen.getByText('Run at'))
    expect(segment('Run at Hour')).toHaveFocus()
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuetext', 'Empty')
    expect(segment('Run at Hour')).not.toHaveAttribute('aria-valuenow')
  })

  it('types digits across the segments and commits when focus leaves', async () => {
    const user = userEvent.setup()
    const onValueChange = renderTime()
    await user.click(segment('Run at Hour'))
    // "9" cannot take a second digit in a 12-hour clock, so it moves on.
    await user.keyboard('930p')
    expect(segment('Run at AM/PM')).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
    await user.tab()
    expect(onValueChange).toHaveBeenCalledWith('21:30')
  })

  it('waits for a second digit when one could still fit, and moves on at a separator', async () => {
    const user = userEvent.setup()
    renderTime({ locale: 'en-GB' })
    await user.click(segment('Run at Hour'))
    await user.keyboard('1')
    expect(segment('Run at Hour')).toHaveFocus()
    expect(segment('Run at Hour')).toHaveValue('01')
    await user.keyboard(':')
    expect(segment('Run at Minute')).toHaveFocus()
  })

  it('steps with the arrows, wraps, and jumps to the ends with Home and End', async () => {
    const user = userEvent.setup()
    renderTime({ locale: 'en-GB', minuteStep: 15, defaultValue: '23:50' })
    await user.click(segment('Run at Hour'))
    await user.keyboard('{ArrowUp}')
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuenow', '22')
    await user.keyboard('{Home}')
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{End}')
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuenow', '23')
    await user.keyboard('{ArrowRight}')
    expect(segment('Run at Minute')).toHaveFocus()
    // 50 steps up to the next quarter, which wraps to 00.
    await user.keyboard('{ArrowUp}')
    expect(segment('Run at Minute')).toHaveValue('00')
    await user.keyboard('{ArrowDown}')
    expect(segment('Run at Minute')).toHaveValue('45')
    await user.keyboard('{ArrowLeft}')
    expect(segment('Run at Hour')).toHaveFocus()
  })

  it('empties a segment with Backspace or Delete, and Backspace moves back from an empty one', async () => {
    const user = userEvent.setup()
    renderTime({ locale: 'en-GB', defaultValue: '08:15' })
    await user.click(segment('Run at Minute'))
    await user.keyboard('{Delete}')
    expect(segment('Run at Minute')).toHaveAttribute('aria-valuetext', 'Empty')
    await user.keyboard('{Backspace}')
    expect(segment('Run at Hour')).toHaveFocus()
    await user.keyboard('{Backspace}')
    expect(segment('Run at Hour')).toHaveAttribute('aria-valuetext', 'Empty')
  })

  it('states an incomplete or out-of-range time, keeps the value, and commits on Enter', async () => {
    const user = userEvent.setup()
    const onValueChange = renderTime({ locale: 'en-GB', min: '09:00', max: '18:00' })
    await user.click(segment('Run at Hour'))
    await user.keyboard('7{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the hour and the minutes.')
    await user.keyboard('{ArrowRight}00{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 09:00 or later.')
    expect(segment('Run at Hour')).toHaveAttribute('aria-invalid', 'true')
    expect(onValueChange).not.toHaveBeenCalled()
    await user.keyboard('{Shift>}{Tab}{/Shift}{ArrowUp}{ArrowUp}{Enter}')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onValueChange).toHaveBeenCalledWith('09:00')
  })

  it('follows a controlled value, and submits HH:mm whatever the locale', () => {
    const { rerender } = render(<TimePicker aria-label="Window" locale="en-US" name="at" value="08:05" />)
    expect(segment('Window Hour')).toHaveValue('8')
    expect(document.querySelector('input[name="at"]')).toHaveValue('08:05')
    rerender(<TimePicker aria-label="Window" locale="en-US" name="at" value="17:45" />)
    expect(segment('Window Hour')).toHaveValue('5')
    expect(segment('Window AM/PM')).toHaveValue('PM')
  })

  it('is disabled as a whole, stated rather than faded', () => {
    render(<TimePicker aria-label="Window" disabled defaultValue="08:05" />)
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeDisabled()
    expect(document.querySelector('[data-slot="time-picker-field"]')).toHaveAttribute('data-disabled')
  })
})

describe('DateTimePicker', () => {
  it('names each half by the label and its word, and reports one Date once both are filled', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Field label="Deploy at">
        {(control) => (
          <DateTimePicker {...control} locale="en-GB" today={TODAY} name="deployAt" onValueChange={onValueChange} />
        )}
      </Field>,
    )
    expect(screen.getByRole('group', { name: 'Deploy at' })).toBeInTheDocument()
    const date = screen.getByRole('textbox', { name: 'Deploy at Date' })
    await user.type(date, '14/10/2026{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
    await user.click(segment('Deploy at Time Hour'))
    await user.keyboard('0930')
    await user.tab()
    expect(onValueChange).toHaveBeenLastCalledWith(new Date(2026, 9, 14, 9, 30))
    expect(document.querySelector('input[name="deployAt"]')).toHaveValue('2026-10-14T09:30')
  })

  it('refuses a time before the minimum on the boundary day, under both halves', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <DateTimePicker
        aria-label="Deploy at"
        locale="en-GB"
        today={TODAY}
        min={new Date(2026, 9, 6, 9, 0)}
        defaultValue={new Date(2026, 9, 7, 8, 0)}
        onValueChange={onValueChange}
      />,
    )
    const date = screen.getByRole('textbox', { name: 'Deploy at Date' })
    await user.clear(date)
    await user.type(date, '06/10/2026{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 6 Oct 2026, 09:00 or later.')
    expect(onValueChange).not.toHaveBeenCalled()
    expect(date).toHaveAttribute('aria-invalid', 'true')
  })

  it('opens the calendar from its button, controlled through open and onOpenChange', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<DateTimePicker aria-label="Deploy at" locale="en-GB" today={TODAY} onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Choose date' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(await screen.findByRole('grid')).toBeInTheDocument()
  })
})
