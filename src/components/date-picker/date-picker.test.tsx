import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { Calendar } from './calendar'
import { DatePicker } from './date-picker'
import { DateRangePicker } from './date-range-picker'
import { getDatePattern, getWeekStart, parseInputDate } from './date-utils'

// Tuesday 6 October 2026, at local midnight. Every test pins "now".
const TODAY = new Date(2026, 9, 6)
const day = (d: number, m = 9, y = 2026) => new Date(y, m, d)

function focusedCell() {
  return document.activeElement as HTMLElement
}

describe('date utilities', () => {
  it('reads the typed order from Intl, not from the language', () => {
    expect(getDatePattern('en-GB').pattern).toBe('DD/MM/YYYY')
    expect(getDatePattern('en-US').pattern).toBe('MM/DD/YYYY')
    expect(getDatePattern('he-IL').pattern).toBe('DD.MM.YYYY')
    expect(getDatePattern('ar-EG').pattern).toBe('DD/MM/YYYY')
  })

  it('parses any separator, the locale’s own digits, and rejects days that do not exist', () => {
    expect(parseInputDate('6.10.2026', 'en-GB')).toEqual({ ok: true, date: day(6) })
    expect(parseInputDate('10/6/26', 'en-US')).toEqual({ ok: true, date: day(6) })
    expect(parseInputDate('٠٦‏/١٠‏/٢٠٢٦', 'ar-EG')).toEqual({ ok: true, date: day(6) })
    expect(parseInputDate('31/02/2026', 'en-GB')).toEqual({ ok: false, reason: 'nonexistent' })
    expect(parseInputDate('next tuesday', 'en-GB')).toEqual({ ok: false, reason: 'format' })
  })

  it('takes the first day of the week from the locale', () => {
    expect(getWeekStart('en-GB')).toBe(1)
    expect(getWeekStart('en-US')).toBe(0)
    expect(getWeekStart('ar-EG')).toBe(6)
  })
})

describe('Calendar', () => {
  function renderCalendar(props: Partial<React.ComponentProps<typeof Calendar>> = {}) {
    const onSelect = vi.fn()
    render(<Calendar locale="en-GB" today={TODAY} onSelect={onSelect} autoFocus {...props} />)
    return onSelect
  }

  it('is a grid named by its month, with weekday headers in the locale’s order', () => {
    renderCalendar()
    const grid = screen.getByRole('grid', { name: 'October 2026' })
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers[0]).toBe('Mon')
    expect(headers[6]).toBe('Sun')
    expect(grid).toBeInTheDocument()
  })

  it('marks today with aria-current and the selected day with aria-selected', () => {
    renderCalendar({ selected: { start: day(9), end: day(9) } })
    expect(screen.getByRole('gridcell', { name: /6 October 2026, today/ })).toHaveAttribute('aria-current', 'date')
    expect(screen.getByRole('gridcell', { name: /, 9 October 2026/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('gridcell', { name: /, 8 October 2026/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('keeps one tab stop and moves it with the APG keys', async () => {
    renderCalendar()
    expect(focusedCell()).toHaveAccessibleName(/6 October 2026/)
    expect(screen.getAllByRole('gridcell').filter((c) => c.tabIndex === 0)).toHaveLength(1)

    await userEvent.keyboard('{ArrowRight}')
    expect(focusedCell()).toHaveAccessibleName(/Wednesday, 7 October/)
    await userEvent.keyboard('{ArrowDown}')
    expect(focusedCell()).toHaveAccessibleName(/14 October/)
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}')
    expect(focusedCell()).toHaveAccessibleName(/6 October/)
    await userEvent.keyboard('{Home}')
    expect(focusedCell()).toHaveAccessibleName(/Monday, 5 October/)
    await userEvent.keyboard('{End}')
    expect(focusedCell()).toHaveAccessibleName(/Sunday, 11 October/)
  })

  it('pages by month and, with Shift, by year — clamping to the shorter month', async () => {
    renderCalendar({ defaultFocusedDate: day(31) })
    await userEvent.keyboard('{PageDown}')
    expect(focusedCell()).toHaveAccessibleName(/30 November 2026/)
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument()
    await userEvent.keyboard('{PageUp}{PageUp}')
    expect(focusedCell()).toHaveAccessibleName(/30 September 2026/)
    await userEvent.keyboard('{Shift>}{PageDown}{/Shift}')
    expect(focusedCell()).toHaveAccessibleName(/30 September 2027/)
    await userEvent.keyboard('{Shift>}{PageUp}{/Shift}')
    expect(focusedCell()).toHaveAccessibleName(/30 September 2026/)
  })

  it('selects with Enter and Space, and not on an unavailable day', async () => {
    const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
    const onSelect = renderCalendar({ isDateDisabled: weekend })
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith(day(6))
    await userEvent.keyboard('{End}')
    expect(focusedCell()).toHaveAccessibleName(/11 October 2026, unavailable/)
    expect(focusedCell()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('does not move focus past min or max', async () => {
    renderCalendar({ min: day(5), max: day(8) })
    await userEvent.keyboard('{ArrowUp}')
    expect(focusedCell()).toHaveAccessibleName(/5 October/)
    await userEvent.keyboard('{PageDown}')
    expect(focusedCell()).toHaveAccessibleName(/8 October/)
    expect(screen.getByRole('button', { name: /Next month/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Previous month/ })).toBeDisabled()
    expect(screen.getByRole('gridcell', { name: /, 4 October 2026, unavailable/ })).toBeInTheDocument()
  })

  it('mirrors ArrowLeft and ArrowRight in right-to-left', async () => {
    render(
      <DirectionProvider direction="rtl">
        <Calendar locale="he-IL" today={TODAY} autoFocus />
      </DirectionProvider>,
    )
    await userEvent.keyboard('{ArrowLeft}')
    expect(focusedCell().dataset.date).toBe('2026-10-07')
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(focusedCell().dataset.date).toBe('2026-10-05')
  })

  it('changes month from the buttons without moving focus off them', async () => {
    renderCalendar()
    const next = screen.getByRole('button', { name: 'Next month, November 2026' })
    await userEvent.click(next)
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument()
    expect(next).toHaveFocus()
  })
})

describe('DatePicker', () => {
  it('takes Field wiring and states the format', () => {
    render(
      <Field label="Evaluation date" hint="Runs at 02:00 UTC.">
        {(control) => <DatePicker {...control} locale="en-GB" today={TODAY} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Evaluation date' })
    expect(input).toHaveAttribute('placeholder', 'DD/MM/YYYY')
    expect(input).toHaveAccessibleDescription('Format: DD/MM/YYYY Runs at 02:00 UTC.')
  })

  it('opens a calendar dialog on the chosen day, selects with Enter and returns focus to the button', async () => {
    const onValueChange = vi.fn()
    render(<DatePicker aria-label="Evaluation date" locale="en-GB" today={TODAY} onValueChange={onValueChange} />)
    const button = screen.getByRole('button', { name: 'Choose date' })
    await userEvent.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'October 2026' })
    expect(dialog).toBeInTheDocument()
    await waitFor(() => expect(focusedCell()).toHaveAccessibleName(/6 October 2026/))
    await userEvent.keyboard('{ArrowRight}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith(day(7))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(button).toHaveFocus()
    expect(screen.getByRole('textbox')).toHaveValue('07/10/2026')
    expect(screen.getByRole('button', { name: 'Change date, Wednesday, 7 October 2026' })).toBeInTheDocument()
  })

  it('closes on Escape without changing the value, and focus goes back to the button', async () => {
    const onValueChange = vi.fn()
    render(<DatePicker aria-label="Date" locale="en-GB" today={TODAY} onValueChange={onValueChange} />)
    const button = screen.getByRole('button', { name: 'Choose date' })
    await userEvent.click(button)
    await screen.findByRole('dialog')
    await userEvent.keyboard('{ArrowDown}{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(button).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('commits typed dates on Enter and normalises them', async () => {
    const onValueChange = vi.fn()
    render(<DatePicker aria-label="Date" locale="en-GB" today={TODAY} onValueChange={onValueChange} />)
    const input = screen.getByRole('textbox', { name: 'Date' })
    await userEvent.type(input, '9.10.26{Enter}')
    expect(onValueChange).toHaveBeenCalledWith(day(9))
    expect(input).toHaveValue('09/10/2026')
  })

  it('states why a typed date was refused, in words', async () => {
    render(<DatePicker aria-label="Date" locale="en-GB" today={TODAY} min={TODAY} />)
    const input = screen.getByRole('textbox', { name: 'Date' })
    await userEvent.type(input, 'soon{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('“soon” is not a date. Type it as DD/MM/YYYY.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await userEvent.clear(input)
    await userEvent.type(input, '31/02/2027{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('31/02/2027 does not exist in the calendar.')
    await userEvent.clear(input)
    await userEvent.type(input, '01/10/2026')
    await userEvent.tab()
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 6 October 2026 or later.')
    await userEvent.clear(input)
    await userEvent.type(input, '12/10/2026{Enter}')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('submits ISO dates whatever the display locale', () => {
    const { container } = render(
      <DatePicker aria-label="Date" name="runOn" locale="ar-EG" defaultValue={day(6)} today={TODAY} />,
    )
    expect(container.querySelector('input[name="runOn"]')).toHaveValue('2026-10-06')
    expect(screen.getByRole('textbox')).toHaveValue('٠٦‏/١٠‏/٢٠٢٦')
  })

  it('is stated as disabled', () => {
    render(<DatePicker aria-label="Date" locale="en-GB" disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choose date' })).toBeDisabled()
  })
})

describe('DateRangePicker', () => {
  it('is a button named by its Field and described by the period', () => {
    render(
      <Field label="Report period">
        {(control) => (
          <DateRangePicker {...control} locale="en-GB" today={TODAY} defaultValue={{ start: day(1), end: day(6) }} />
        )}
      </Field>,
    )
    const trigger = screen.getByRole('button', { name: 'Report period' })
    expect(trigger).toHaveAccessibleDescription(/^1\s*–\s*6 Oct 2026$/)
  })

  it('applies a preset relative to today and checks it', async () => {
    const onValueChange = vi.fn()
    render(<DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Period' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Last 7 days' }))
    expect(onValueChange).toHaveBeenCalledWith({ start: day(30, 8), end: day(6) })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Period' }))
    expect(await screen.findByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('takes two presses in either order, saying what to choose next', async () => {
    const onValueChange = vi.fn()
    render(<DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Period' }))
    await screen.findByRole('dialog')
    await waitFor(() => expect(focusedCell()).toHaveAccessibleName(/6 October/))
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Start 6 October 2026. Choose the end date.')
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{ArrowUp}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith({ start: day(29, 8), end: day(6) })
  })

  it('marks the ends and the inside of a range in words', async () => {
    render(
      <DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} defaultValue={{ start: day(5), end: day(8) }} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Period' }))
    expect(await screen.findByRole('gridcell', { name: /5 October 2026, range start/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('gridcell', { name: /, 7 October 2026/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('gridcell', { name: /8 October 2026, range end/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/5\s*–\s*8 Oct 2026, 4 days\./)
  })

  it('disables presets that fall outside min and max', async () => {
    render(<DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} min={day(1)} />)
    await userEvent.click(screen.getByRole('button', { name: 'Period' }))
    expect(await screen.findByRole('button', { name: 'Last 30 days' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'This month' })).toBeEnabled()
  })

  describe('typed entry', () => {
    async function openPicker(props: Partial<React.ComponentProps<typeof DateRangePicker>> = {}) {
      const onValueChange = vi.fn()
      render(
        <DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} onValueChange={onValueChange} {...props} />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Period' }))
      await screen.findByRole('dialog')
      return {
        onValueChange,
        start: screen.getByRole('textbox', { name: 'Start date' }),
        end: screen.getByRole('textbox', { name: 'End date' }),
      }
    }

    it('commits a typed start and end on Enter, moving the calendar to each', async () => {
      const { onValueChange, start, end } = await openPicker()
      expect(start).toHaveAttribute('placeholder', 'DD/MM/YYYY')
      expect(start).toHaveAccessibleDescription('Format: DD/MM/YYYY')
      await userEvent.type(start, '1.9.26{Enter}')
      expect(start).toHaveValue('01/09/2026')
      expect(screen.getByRole('grid', { name: 'September 2026' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Start 1 September 2026. Choose the end date.')
      expect(onValueChange).not.toHaveBeenCalled()
      await userEvent.type(end, '12/10/2026{Enter}')
      expect(onValueChange).toHaveBeenCalledWith({ start: day(1, 8), end: day(12) })
      expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(/, 42 days\./)
      // Still open, so the range can be checked on the grid.
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('completes a typed start with a pressed day', async () => {
      const { onValueChange, start } = await openPicker()
      await userEvent.type(start, '05/10/2026{Enter}')
      await userEvent.click(screen.getByRole('gridcell', { name: /, 8 October 2026/ }))
      expect(onValueChange).toHaveBeenCalledWith({ start: day(5), end: day(8) })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('refuses an unreadable or unavailable date with a sentence and keeps the value', async () => {
      const { onValueChange, start, end } = await openPicker({
        defaultValue: { start: day(1), end: day(5) },
        max: TODAY,
      })
      await userEvent.clear(start)
      await userEvent.type(start, 'soon{Enter}')
      expect(screen.getByRole('alert')).toHaveTextContent('“soon” is not a date. Type the start date as DD/MM/YYYY.')
      expect(start).toHaveAttribute('aria-invalid', 'true')
      expect(start).toHaveAccessibleDescription(/Format: DD\/MM\/YYYY “soon” is not a date/)
      await userEvent.clear(end)
      await userEvent.type(end, '20/10/2026{Enter}')
      expect(screen.getAllByRole('alert')[1]).toHaveTextContent('Choose 6 October 2026 or earlier.')
      expect(onValueChange).not.toHaveBeenCalled()
      expect(screen.getByRole('status')).toHaveTextContent(/1\s*–\s*5 Oct 2026, 5 days\./)
      // Fixing the start clears only its own error.
      await userEvent.clear(start)
      await userEvent.type(start, '02/10/2026{Enter}')
      expect(start).not.toHaveAttribute('aria-invalid')
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(onValueChange).toHaveBeenCalledWith({ start: day(2), end: day(5) })
    })

    it('refuses an end before the start, naming the start', async () => {
      const { onValueChange, end } = await openPicker({ defaultValue: { start: day(5), end: day(8) } })
      await userEvent.clear(end)
      await userEvent.type(end, '01/10/2026')
      await userEvent.tab()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The end date is before the start date, 5 October 2026. Choose that day or later.',
      )
      expect(end).toHaveAttribute('aria-invalid', 'true')
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('reads typed dates in the locale’s order', async () => {
      const { onValueChange, start, end } = await openPicker({ locale: 'de-DE' })
      expect(start).toHaveAttribute('placeholder', 'DD.MM.YYYY')
      expect(screen.getByText('Format: DD.MM.YYYY')).toBeInTheDocument()
      await userEvent.type(start, '9.10.2026{Enter}')
      await userEvent.type(end, '12/10/2026{Enter}')
      expect(onValueChange).toHaveBeenCalledWith({ start: day(9), end: day(12) })
      expect(end).toHaveValue('12.10.2026')
    })

    it('opens on the grid, with the inputs before it in Tab order', async () => {
      const onValueChange = vi.fn()
      render(<DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} onValueChange={onValueChange} />)
      const trigger = screen.getByRole('button', { name: 'Period' })
      trigger.focus()
      await userEvent.keyboard('{Enter}')
      await screen.findByRole('dialog')
      await waitFor(() => expect(focusedCell()).toHaveAccessibleName(/6 October 2026, today/))
      await userEvent.tab({ shift: true })
      expect(screen.getByRole('button', { name: /Next month/ })).toHaveFocus()
      await userEvent.tab({ shift: true })
      await userEvent.tab({ shift: true })
      expect(screen.getByRole('textbox', { name: 'End date' })).toHaveFocus()
      await userEvent.tab({ shift: true })
      const start = screen.getByRole('textbox', { name: 'Start date' })
      expect(start).toHaveFocus()
      // Blur commits, as Enter does.
      await userEvent.keyboard('28/09/2026')
      await userEvent.tab()
      expect(screen.getByRole('status')).toHaveTextContent('Start 28 September 2026. Choose the end date.')
      // Escape discards what was typed but not committed, and the half-chosen range.
      await userEvent.keyboard('30/09/2026{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(trigger).toHaveFocus()
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('can be turned off', async () => {
      render(<DateRangePicker aria-label="Period" locale="en-GB" today={TODAY} typedEntry={false} />)
      await userEvent.click(screen.getByRole('button', { name: 'Period' }))
      await screen.findByRole('dialog')
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })
})
