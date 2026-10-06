'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { CalendarDays, Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type FieldControlSize, fieldControlClasses, fieldControlSizes } from '../field/field-control'
import { Input } from '../field/input'
import { Label } from '../field/label'
import { floatingSurface } from '../popover/surface'
import { Calendar } from './calendar'
import { DateError } from './date-picker'
import {
  compareDays,
  type DateLocale,
  type DateRange,
  type DateRangePreset,
  defaultRangePresets,
  formatInputDate,
  formatLongDate,
  getDatePattern,
  isSameDay,
  readTypedDate,
  startOfDay,
  toISODate,
} from './date-utils'

/**
 * A period, for the reports and run histories every internal tool filters by.
 *
 * ── presets first ──
 * Most periods an operator picks are "the last seven days" or "last month".
 * The presets sit beside the calendar (above it on a phone) as a list, with
 * the active one checked: a check and a wash, the same "selected" the Select
 * popup uses, because a preset is a value, not the cursor. Presets are
 * computed from `today`, so a story or a test can pin "now".
 *
 * ── two presses, and a sentence while you choose ──
 * The first day pressed is the start, the second the end — in either order;
 * a second press before the first is taken as the start. Between the two
 * presses a polite status line says "Choose the end date", so the half-chosen
 * state is stated rather than inferred from a lone filled cell.
 *
 * ── typed entry: two inputs inside the popup ──
 * Typing is as first-class here as in `DatePicker`, for the same reasons: it
 * is faster for someone who knows the dates, and a screen-reader user should
 * not be forced through a grid. Two dates in ONE input is a format nobody
 * agrees on ("1–6/10", "01/10/2026 - 06/10/2026"), so the popup carries two
 * labelled inputs, "Start date" and "End date", above the calendar. They
 * use the single picker's parsing and sentences (`readTypedDate`): the
 * locale's order read from `Intl`, any separator, commit on Enter or blur,
 * never per keystroke. A committed date moves the calendar to its month. An
 * end before the start, or a start after the end, is refused with a
 * sentence naming the other date, and the value is left alone. One end
 * typed on its own is the same half-chosen state as one day pressed: the
 * next press or typed date completes it. A complete range commits at once
 * but leaves the popup open, so the person sees it drawn on the grid; the
 * status line states it, and Escape or a press outside closes.
 *
 * ── focus opens on the grid ──
 * The popup is opened from a button the person pressed to see a calendar,
 * and the APG date picker dialog puts focus on the chosen day — as the
 * single picker's popup does. So initial focus stays on the grid, and the
 * inputs are before it in Tab order: presets, start, end, the month buttons,
 * the grid. Shift+Tab from the grid reaches the end input in three steps.
 * `typedEntry={false}` removes the inputs, for a filter where the presets
 * and the grid are enough.
 *
 * ── the trigger is a button, named by its Field ──
 * The trigger is a button, labelled by `Field`'s label; its text
 * — the formatted period — is wired into its description so a screen reader
 * hears "Report period, button, 6 – 12 Oct 2026" rather than only the
 * label. The period is written with `Intl.DateTimeFormat#formatRange`, which
 * knows that `es-PA` writes "6 – 12 de oct de 2026" and collapses the
 * shared month and year.
 */

export interface DateRangePickerProps {
  value?: DateRange
  defaultValue?: DateRange
  onValueChange?: (value: DateRange) => void
  /** Pass `[]` for none. */
  presets?: DateRangePreset[]
  locale?: DateLocale
  weekStartsOn?: number
  min?: Date | null
  max?: Date | null
  isDateDisabled?: (date: Date) => boolean
  today?: Date
  /**
   * Start and end inputs above the calendar. On by default: typing is the
   * accessible path into a date, not an extra, and the single picker always
   * has it. Turn it off only where presets and the grid cover every case.
   */
  typedEntry?: boolean
  /** Open the calendar on first render. */
  defaultOpen?: boolean
  /** Submitted as `<name>-start` and `<name>-end`, `yyyy-mm-dd`. */
  name?: string
  size?: FieldControlSize
  disabled?: boolean
  required?: boolean
  placeholder?: string
  id?: string
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

const EMPTY: DateRange = { start: null, end: null }

/** "6 – 12 Oct 2026" in the locale's own words, or null for an incomplete range. */
export function formatDateRange(range: DateRange, locale: DateLocale): string | null {
  if (!range.start || !range.end) return null
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  return isSameDay(range.start, range.end) ? format.format(range.start) : format.formatRange(range.start, range.end)
}

function dayCount(range: DateRange) {
  return Math.round((startOfDay(range.end!).getTime() - startOfDay(range.start!).getTime()) / 86_400_000) + 1
}

export function DateRangePicker({
  value: valueProp,
  defaultValue = EMPTY,
  onValueChange,
  presets = defaultRangePresets,
  locale,
  weekStartsOn,
  min,
  max,
  isDateDisabled,
  today: todayProp,
  typedEntry = true,
  defaultOpen = false,
  name,
  size = 'md',
  disabled,
  required,
  placeholder = 'Choose a period',
  id,
  className,
  'aria-describedby': describedByProp,
  'aria-invalid': invalid,
  'aria-label': ariaLabel,
}: DateRangePickerProps) {
  const uid = React.useId()
  const valueId = `${uid}-value`
  const formatId = `${uid}-format`
  const isControlled = valueProp !== undefined
  const [inner, setInner] = React.useState<DateRange>(defaultValue)
  const value = isControlled ? valueProp : inner
  const [open, setOpen] = React.useState(defaultOpen)
  // Read by the inputs' blur handler: closing with Escape returns focus to
  // the trigger, and the blur that causes must not commit what was typed.
  const openRef = React.useRef(open)
  // The half-chosen range lives only while the popup is open; closing it
  // without completing it leaves the committed value untouched.
  const [draft, setDraft] = React.useState<DateRange | null>(null)
  // The day a typed date asked the calendar to show; see `visibleDate`.
  const [visibleDate, setVisibleDate] = React.useState<Date | null>(null)
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const activeCellRef = React.useRef<HTMLTableCellElement>(null)
  const today = startOfDay(todayProp ?? new Date())
  const { pattern } = getDatePattern(locale)

  const shown = draft ?? value
  const startInput = useTypedEnd(shown.start, locale, open)
  const endInput = useTypedEnd(shown.end, locale, open)

  function setOpenState(next: boolean) {
    openRef.current = next
    setOpen(next)
    if (!next) {
      setDraft(null)
      startInput.setError(null)
      endInput.setError(null)
    }
  }

  /** Make `next` the value, keeping the popup as it is. */
  function apply(next: DateRange) {
    if (!isControlled) setInner(next)
    onValueChange?.(next)
    setDraft(null)
  }

  function commit(next: DateRange) {
    apply(next)
    setOpenState(false)
  }

  function choose(date: Date) {
    // A range with exactly one end — pressed or typed — is waiting for the other.
    const pending = draft && (draft.start ? !draft.end : draft.end) ? (draft.start ?? draft.end) : null
    if (!pending) {
      setDraft({ start: date, end: null })
      return
    }
    const [start, end] = compareDays(date, pending) < 0 ? [date, pending] : [pending, date]
    commit({ start, end })
  }

  function commitTyped(which: 'start' | 'end') {
    const input = which === 'start' ? startInput : endInput
    const current = shown[which]
    const result = readTypedDate(input.text, { locale, min, max, isDateDisabled }, `the ${which} date`)
    if (!result.ok) {
      input.setError(result.message)
      return
    }
    const date = result.date
    const other = which === 'start' ? shown.end : shown.start
    if (date && other) {
      const otherWords = formatLongDate(other, locale, false)
      if (which === 'start' && compareDays(date, other) > 0) {
        input.setError(`The start date is after the end date, ${otherWords}. Choose that day or earlier.`)
        return
      }
      if (which === 'end' && compareDays(date, other) < 0) {
        input.setError(`The end date is before the start date, ${otherWords}. Choose that day or later.`)
        return
      }
    }
    input.setError(null)
    if (date) input.setText(formatInputDate(date, locale))
    if (date ? isSameDay(date, current) : !current) return
    if (date) setVisibleDate(date)
    const next = { ...shown, [which]: date }
    if ((next.start && next.end) || (!next.start && !next.end)) apply(next)
    else setDraft(next)
  }

  const inRange = (r: { start: Date; end: Date }) =>
    (!min || compareDays(r.start, min) >= 0) && (!max || compareDays(r.end, max) <= 0)

  const label = formatDateRange(value, locale)
  const status =
    shown.start && shown.end
      ? `${formatDateRange(shown, locale)}, ${dayCount(shown)} ${dayCount(shown) === 1 ? 'day' : 'days'}.`
      : shown.start
        ? `Start ${formatLongDate(shown.start, locale, false)}. Choose the end date.`
        : shown.end
          ? `End ${formatLongDate(shown.end, locale, false)}. Choose the start date.`
          : 'Choose the start date.'

  function typedInput(which: 'start' | 'end', input: TypedEnd) {
    const inputId = `${uid}-${which}`
    const errorId = `${uid}-${which}-error`
    return (
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={inputId}>{which === 'start' ? 'Start date' : 'End date'}</Label>
        <Input
          id={inputId}
          size="sm"
          value={input.text}
          placeholder={pattern}
          autoComplete="off"
          inputMode="numeric"
          aria-describedby={[formatId, input.error ? errorId : undefined].filter(Boolean).join(' ')}
          aria-invalid={input.error ? true : undefined}
          className="tabular-nums"
          onChange={(event) => input.setText(event.target.value)}
          onBlur={() => {
            if (openRef.current) commitTyped(which)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitTyped(which)
            }
          }}
        />
      </div>
    )
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={setOpenState}
    >
      <div ref={anchorRef} data-slot="date-range-picker" className={className}>
        <PopoverPrimitive.Trigger
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-required={required || undefined}
          aria-invalid={invalid === true || invalid === 'true' ? true : undefined}
          aria-describedby={[valueId, describedByProp].filter(Boolean).join(' ')}
          className={cn(
            fieldControlClasses,
            fieldControlSizes[size],
            'flex cursor-default items-center justify-between gap-3 text-start',
            'focus-visible:shadow-[var(--focus-ring)] data-popup-open:shadow-[var(--focus-ring)]',
            'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
          )}
        >
          {/* `dir="auto"`: a formatted period is text in the locale's own
              direction, and "14.–25. Sept. 2026" laid out right-to-left
              comes apart into "Sept. 2026 .25–.14". */}
          <span dir="auto" id={valueId} className={cn('min-w-0 truncate tabular-nums', !label && 'text-ink-muted')}>
            {label ?? placeholder}
          </span>
          <CalendarDays aria-hidden className="size-4 shrink-0 text-ink-muted" />
        </PopoverPrimitive.Trigger>
        {name ? (
          <>
            <input type="hidden" name={`${name}-start`} value={value.start ? toISODate(value.start) : ''} />
            <input type="hidden" name={`${name}-end`} value={value.end ? toISODate(value.end) : ''} />
          </>
        ) : null}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner anchor={anchorRef} side="bottom" align="start" sideOffset={6} className="z-50">
          <PopoverPrimitive.Popup
            data-slot="date-range-picker-popup"
            initialFocus={activeCellRef}
            className={cn(floatingSurface, 'flex max-w-[calc(100vw-2rem)] flex-col sm:flex-row')}
          >
            {presets.length > 0 ? (
              <div
                role="group"
                aria-label="Presets"
                className="flex flex-wrap gap-1 border-b border-keyline p-2 sm:w-40 sm:flex-col sm:flex-nowrap sm:border-e sm:border-b-0"
              >
                {presets.map((preset) => {
                  const range = preset.range(today)
                  const active = isSameDay(range.start, value.start) && isSameDay(range.end, value.end)
                  const available = inRange(range)
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={active}
                      disabled={!available}
                      onClick={() => commit(range)}
                      className={cn(
                        'flex h-(--control-h-sm) items-center gap-2 pe-3 ps-2 text-start font-ui text-sm text-ink whitespace-nowrap',
                        'transition-colors duration-(--motion-cut) hover:bg-ink-soft',
                        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                        'aria-pressed:bg-ink-soft aria-pressed:font-semibold',
                        'disabled:cursor-not-allowed disabled:text-ink-muted disabled:line-through disabled:hover:bg-transparent',
                      )}
                    >
                      <Check aria-hidden strokeWidth={2.5} className={cn('size-3.5 shrink-0', !active && 'invisible')} />
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <div className="grid gap-3 p-3">
              {typedEntry ? (
                <div role="group" aria-label="Type the dates" className="grid max-w-[calc(var(--control-h)*7)] gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {typedInput('start', startInput)}
                    {typedInput('end', endInput)}
                  </div>
                  <span id={formatId} className="text-xs leading-snug text-ink-muted">
                    Format: {pattern}
                  </span>
                  {startInput.error ? <DateError id={`${uid}-start-error`}>{startInput.error}</DateError> : null}
                  {endInput.error ? <DateError id={`${uid}-end-error`}>{endInput.error}</DateError> : null}
                </div>
              ) : null}
              <Calendar
                key={open ? 'open' : 'closed'}
                selected={{ start: shown.start, end: shown.end ?? shown.start }}
                onSelect={choose}
                defaultFocusedDate={value.end ?? value.start}
                visibleDate={visibleDate}
                today={today}
                min={min}
                max={max}
                isDateDisabled={isDateDisabled}
                locale={locale}
                weekStartsOn={weekStartsOn}
                activeCellRef={activeCellRef}
                renderHeading={(props) => <PopoverPrimitive.Title aria-live="polite" {...props} />}
              />
              <p role="status" dir="auto" className="m-0 max-w-[calc(var(--control-h)*7)] text-xs text-ink-2">
                {status}
              </p>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

interface TypedEnd {
  text: string
  setText: (text: string) => void
  error: string | null
  setError: (error: string | null) => void
}

/**
 * The text and error of one typed end. A date that changes from outside —
 * a pressed day, a preset, a controlled value, reopening the popup —
 * replaces the text and clears that end's error, adjusted during render so
 * the input never paints a frame of stale text. Each end keys on its own
 * date, so fixing the start does not wipe a mistake still showing in the end.
 */
function useTypedEnd(date: Date | null, locale: DateLocale, open: boolean): TypedEnd {
  const format = () => (date ? formatInputDate(date, locale) : '')
  const [text, setText] = React.useState(format)
  const [error, setError] = React.useState<string | null>(null)
  const key = `${date ? toISODate(date) : ''}|${String(locale)}|${open}`
  const [shownKey, setShownKey] = React.useState(key)
  if (shownKey !== key) {
    setShownKey(key)
    setText(format())
    setError(null)
  }
  return { text, setText, error, setError }
}
