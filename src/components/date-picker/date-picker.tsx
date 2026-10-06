'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { CalendarDays } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type FieldControlSize } from '../field/field-control'
import { Input } from '../field/input'
import { floatingSurface } from '../popover/surface'
import { Calendar } from './calendar'
import {
  compareDays,
  type DateLocale,
  formatInputDate,
  formatLongDate,
  getDatePattern,
  parseInputDate,
  startOfDay,
  toISODate,
} from './date-utils'

/**
 * A date you can type or pick — the APG "date picker dialog" pattern: a text
 * input, a button beside it that opens a calendar in a dialog, and focus
 * returned to that button when the dialog closes.
 *
 * ── typing is first-class ──
 * Someone who knows the date types it faster than they can page to it, and
 * a screen-reader user should never be forced through a grid. The input
 * accepts the locale's own order, read from `Intl` rather than guessed from
 * the language: `es-ES` is DD/MM/YYYY but `es-PA` is MM/DD/YYYY, which a
 * table keyed on "Spanish" would get wrong. Any separator works, and the
 * pattern is the placeholder and part of the input's description. The
 * value commits on blur or Enter, never per keystroke: "1" is not yet a
 * wrong date, and announcing it as one would be noise.
 *
 * ── errors are sentences, owned here ──
 * Only this component knows why "31/02/2026" failed, so it states it — "does
 * not exist in the calendar", "choose 6 October 2026 or later" — with the
 * same mark and `role="alert"` that `Field` uses. A caller's own `Field`
 * error still applies on top, for rules this component cannot know, such
 * as "required".
 *
 * ── the popup is anchored to the whole control ──
 * The calendar is positioned against the input group, not the small button,
 * so it lines up with the field's edge rather than hanging off an icon.
 */

export interface DatePickerProps {
  value?: Date | null
  defaultValue?: Date | null
  onValueChange?: (value: Date | null) => void
  /** BCP 47 tag for names, digits, typed order and week start. `undefined` uses the runtime's locale. */
  locale?: DateLocale
  /** 0 = Sunday … 6 = Saturday. Overrides the locale's first day of the week. */
  weekStartsOn?: number
  min?: Date | null
  max?: Date | null
  isDateDisabled?: (date: Date) => boolean
  /** Inject "now" for stable stories and tests. */
  today?: Date
  /** Open the calendar on first render — for a step that exists only to pick a date. */
  defaultOpen?: boolean
  /** Submitted as `yyyy-mm-dd`, whatever the display locale. */
  name?: string
  size?: FieldControlSize
  disabled?: boolean
  required?: boolean
  /** Defaults to the locale's format, e.g. `DD/MM/YYYY`. */
  placeholder?: string
  id?: string
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

const errorClasses = 'flex items-start gap-2 text-xs leading-snug font-medium text-ink-danger'

export function DateError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className={errorClasses}>
      <span aria-hidden className="mt-[0.3em] size-2 shrink-0 bg-rojo shadow-cut" />
      <span>{children}</span>
    </span>
  )
}

/** The trailing button that opens a calendar. */
export const calendarButtonClasses = cn(
  '-me-1 grid size-7 shrink-0 place-items-center text-ink-muted',
  'transition-colors duration-(--motion-cut) hover:bg-ink-soft hover:text-ink',
  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] data-popup-open:bg-ink-soft data-popup-open:text-ink',
  'disabled:cursor-not-allowed disabled:hover:bg-transparent [&_svg]:size-4',
)

export function DatePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  locale,
  weekStartsOn,
  min,
  max,
  isDateDisabled,
  today,
  defaultOpen = false,
  name,
  size = 'md',
  disabled,
  required,
  placeholder,
  id,
  className,
  'aria-describedby': describedByProp,
  'aria-invalid': invalidProp,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const uid = React.useId()
  const formatId = `${uid}-format`
  const errorId = `${uid}-error`
  const isControlled = valueProp !== undefined
  const [inner, setInner] = React.useState<Date | null>(defaultValue)
  const value = isControlled ? valueProp : inner
  const [text, setText] = React.useState(() => (value ? formatInputDate(value, locale) : ''))
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(defaultOpen)
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const activeCellRef = React.useRef<HTMLTableCellElement>(null)
  const { pattern } = getDatePattern(locale)

  // A value set from outside (a reset, a preset elsewhere) replaces the text.
  // Adjusted during render rather than in an effect, so the input never
  // paints one frame with the stale text.
  const valueKey = `${value ? toISODate(value) : ''}|${String(locale)}`
  const [shownKey, setShownKey] = React.useState(valueKey)
  if (shownKey !== valueKey) {
    setShownKey(valueKey)
    setText(value ? formatInputDate(value, locale) : '')
  }

  function setValue(next: Date | null) {
    if (!isControlled) setInner(next)
    onValueChange?.(next)
  }

  function reason(date: Date): string | null {
    if (min && compareDays(date, min) < 0) return `Choose ${formatLongDate(min, locale, false)} or later.`
    if (max && compareDays(date, max) > 0) return `Choose ${formatLongDate(max, locale, false)} or earlier.`
    if (isDateDisabled?.(date)) return `${formatLongDate(date, locale)} is not available. Choose another day.`
    return null
  }

  function commit() {
    const typed = text.trim()
    if (!typed) {
      setError(null)
      if (value) setValue(null)
      return
    }
    const parsed = parseInputDate(typed, locale)
    if (!parsed.ok) {
      setError(
        parsed.reason === 'format'
          ? `“${typed}” is not a date. Type it as ${pattern}.`
          : `${typed} does not exist in the calendar. Check the day and month.`,
      )
      return
    }
    const why = reason(parsed.date)
    if (why) {
      setError(why)
      return
    }
    setError(null)
    setText(formatInputDate(parsed.date, locale))
    if (!value || compareDays(value, parsed.date) !== 0) setValue(parsed.date)
  }

  function choose(date: Date) {
    setError(null)
    setText(formatInputDate(date, locale))
    setValue(startOfDay(date))
    setOpen(false)
  }

  const describedBy = [formatId, describedByProp, error ? errorId : undefined].filter(Boolean).join(' ')
  const buttonLabel = value ? `Change date, ${formatLongDate(value, locale)}` : 'Choose date'

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div ref={anchorRef} data-slot="date-picker" className={cn('flex flex-col gap-2', className)}>
        <Input
          id={id}
          size={size}
          value={text}
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? pattern}
          autoComplete="off"
          inputMode="numeric"
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={error || invalidProp === true || invalidProp === 'true' ? true : undefined}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
          trailing={
            <PopoverPrimitive.Trigger
              aria-label={buttonLabel}
              disabled={disabled}
              className={calendarButtonClasses}
            >
              <CalendarDays aria-hidden />
            </PopoverPrimitive.Trigger>
          }
        />
        <span id={formatId} className="sr-only">
          Format: {pattern}
        </span>
        {error ? <DateError id={errorId}>{error}</DateError> : null}
        {name ? <input type="hidden" name={name} value={value ? toISODate(value) : ''} /> : null}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchorRef}
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50"
        >
          <PopoverPrimitive.Popup
            data-slot="date-picker-popup"
            initialFocus={activeCellRef}
            className={cn(floatingSurface, 'p-3')}
          >
            <Calendar
              selected={{ start: value, end: value }}
              onSelect={choose}
              today={today}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              weekStartsOn={weekStartsOn}
              activeCellRef={activeCellRef}
              renderHeading={(props) => <PopoverPrimitive.Title aria-live="polite" {...props} />}
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

