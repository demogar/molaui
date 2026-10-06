'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { CalendarDays, Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type FieldControlSize, fieldControlClasses, fieldControlSizes } from '../field/field-control'
import { floatingSurface } from '../popover/surface'
import { Calendar } from './calendar'
import {
  compareDays,
  type DateLocale,
  type DateRange,
  type DateRangePreset,
  defaultRangePresets,
  formatLongDate,
  isSameDay,
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
 * ── the trigger is a button, named by its Field ──
 * The value is not typeable here: two dates in one input is a format nobody
 * agrees on. The trigger is a button, labelled by `Field`'s label; its text
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
  const isControlled = valueProp !== undefined
  const [inner, setInner] = React.useState<DateRange>(defaultValue)
  const value = isControlled ? valueProp : inner
  const [open, setOpen] = React.useState(defaultOpen)
  // The half-chosen range lives only while the popup is open; closing it
  // without a second press leaves the committed value untouched.
  const [draft, setDraft] = React.useState<DateRange | null>(null)
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const activeCellRef = React.useRef<HTMLTableCellElement>(null)
  const today = startOfDay(todayProp ?? new Date())

  function commit(next: DateRange) {
    if (!isControlled) setInner(next)
    onValueChange?.(next)
    setDraft(null)
    setOpen(false)
  }

  function choose(date: Date) {
    if (!draft?.start || draft.end) {
      setDraft({ start: date, end: null })
      return
    }
    const [start, end] = compareDays(date, draft.start) < 0 ? [date, draft.start] : [draft.start, date]
    commit({ start, end })
  }

  const inRange = (r: { start: Date; end: Date }) =>
    (!min || compareDays(r.start, min) >= 0) && (!max || compareDays(r.end, max) <= 0)

  const shown = draft ?? value
  const label = formatDateRange(value, locale)
  const status = draft?.start
    ? `Start ${formatLongDate(draft.start, locale, false)}. Choose the end date.`
    : value.start && value.end
      ? `${formatDateRange(value, locale)}, ${dayCount(value)} ${dayCount(value) === 1 ? 'day' : 'days'}.`
      : 'Choose the start date.'

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setDraft(null)
      }}
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
          <span id={valueId} className={cn('min-w-0 truncate tabular-nums', !label && 'text-ink-muted')}>
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
            <div className="grid gap-2 p-3">
              <Calendar
                key={open ? 'open' : 'closed'}
                selected={{ start: shown.start, end: shown.end ?? shown.start }}
                onSelect={choose}
                defaultFocusedDate={value.end ?? value.start}
                today={today}
                min={min}
                max={max}
                isDateDisabled={isDateDisabled}
                locale={locale}
                weekStartsOn={weekStartsOn}
                activeCellRef={activeCellRef}
                renderHeading={(props) => <PopoverPrimitive.Title aria-live="polite" {...props} />}
              />
              <p role="status" className="m-0 max-w-[calc(var(--control-h)*7)] text-xs text-ink-2">
                {status}
              </p>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
