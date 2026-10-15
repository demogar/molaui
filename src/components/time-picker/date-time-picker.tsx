'use client'

import * as React from 'react'

import { cn } from '../../lib/cn'
import { joinIds } from '../../lib/merge-props'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useControllable } from '../../lib/use-controllable'
import { useLabelFor } from '../../lib/use-label-for'
import { DateError, DatePicker } from '../date-picker/date-picker'
import { type DateLocale, formatMediumDate, startOfDay } from '../date-picker/date-utils'
import { type FieldControlSize } from '../field/field-control'
import { type DateTimePickerMessages, dateTimePickerMessages } from './messages'
import { TimePicker } from './time-picker'
import { atTime, formatTime, parseTime, toLocalDateTime, toTimeString, type TimeString } from './time-utils'

/**
 * A moment: a DatePicker and a TimePicker side by side, read as one value.
 *
 * ── composed, not a third picker ──
 * The date half is DatePicker itself (typed or picked from the calendar,
 * with its sentences and its `open` / `onOpenChange`), and the time half is
 * TimePicker. A calendar with a time list under it in one popup was the
 * other design; it hides the time behind a button press, gives the time no
 * typed path, and would duplicate both halves' keyboard models. Two fields
 * keep each half's model and errors exactly as their own pages document.
 *
 * ── one value, local time ──
 * `value` is a `Date` in the reader's zone, built from the day and the time
 * as entered; it is `null` until both halves are filled. A zone picker is not
 * part of it: "09:00 in Panama for a reader in Madrid" is a product decision,
 * and the page that makes it can convert the `Date`.
 *
 * ── bounds are moments ──
 * `min` and `max` are `Date`s. Days outside them are unavailable in the
 * calendar, as in DatePicker; a time on the boundary day that falls outside
 * is refused with a sentence under both halves ("Choose 6 Oct 2026, 9:00 AM
 * or later"), because only the pair is wrong, not either half.
 *
 * ── names ──
 * The whole is a `role="group"` named by its label. Each half is named by
 * the same label followed by its own word, "Departure Date", "Departure
 * Hour", so a screen reader user tabbing between them knows which half they
 * are in. `id` goes to the date input, so a `Field` label focuses it.
 *
 * `className`, `ref` and the other DOM props go to the group.
 */

export type { DateTimePickerMessages } from './messages'

export interface DateTimePickerProps
  extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children' | 'role'> {
  /**
   * The moment, controlled, in local time. `null` is none; leave it `undefined` to
   * let the picker hold its own state.
   */
  value?: Date | null
  /** The moment shown on first render, uncontrolled. `null` or omitted starts empty. */
  defaultValue?: Date | null
  /** Called with the combined moment once both halves hold an allowed value, and with `null` when either is emptied. */
  onValueChange?: (value: Date | null) => void
  /** BCP 47 tag for names, digits, the typed date order, the clock and the week start. */
  locale?: DateLocale
  /** Overrides the locale's clock. */
  hourCycle?: 12 | 24
  /** Minutes per Up or Down press in the minute segment. */
  minuteStep?: number
  /** 0 = Sunday … 6 = Saturday. */
  weekStartsOn?: number
  /**
   * The earliest moment, inclusive. Earlier days are unavailable in the calendar,
   * and an earlier time on the same day is refused with a sentence under both halves.
   */
  min?: Date | null
  /**
   * The latest moment, inclusive. Later days are unavailable in the calendar, and a
   * later time on the same day is refused with a sentence under both halves.
   */
  max?: Date | null
  /** Days inside `min`–`max` that still cannot be chosen, as on DatePicker. */
  isDateDisabled?: (date: Date) => boolean
  /** As on DatePicker: inject "now" for stable stories, and pass the server's date when server rendering. */
  today?: Date
  /** Whether the calendar is open, when the page owns that. */
  open?: boolean
  /** Open the calendar on first render. */
  defaultOpen?: boolean
  /** Called when the calendar opens or closes, as on DatePicker. */
  onOpenChange?: (open: boolean) => void
  /** Submitted as `yyyy-mm-ddThh:mm`, local time, as `<input type="datetime-local">` writes it. */
  name?: string
  /** Control height for both halves, shared with Input. Defaults to `md`; density rescales every size. */
  size?: FieldControlSize
  /** Stated, not faded: both halves are disabled and go to the shaded cloth. */
  disabled?: boolean
  /** Marks both halves required for form validation. Inside `Field`, the label carries the required mark. */
  required?: boolean
  /** Given to the date input, so a `<label for>` focuses it. */
  id?: string
  /**
   * Words for translation: "Date" and "Time", which name each half, and the
   * time half's segment names and sentences. Keys left out come from
   * `MessagesProvider`, then English. The date half's words come from the
   * provider's `datePicker` table.
   */
  messages?: MessagesOverride<DateTimePickerMessages>
}

const timeOf = (date: Date | null | undefined): TimeString | null =>
  date ? toTimeString({ hour: date.getHours(), minute: date.getMinutes() }) : null

export function DateTimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  locale: localeProp,
  hourCycle,
  minuteStep,
  weekStartsOn,
  min,
  max,
  isDateDisabled,
  today,
  open,
  defaultOpen,
  onOpenChange,
  name,
  size = 'md',
  disabled,
  required,
  id,
  messages: messagesProp,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': describedByProp,
  'aria-invalid': invalidProp,
  ...props
}: DateTimePickerProps) {
  const uid = React.useId()
  const groupId = `${uid}-group`
  const dateId = id ?? `${uid}-date`
  const dateWordId = `${uid}-date-word`
  const timeWordId = `${uid}-time-word`
  const errorId = `${uid}-error`
  const [t, f] = useMessages('dateTimePicker', dateTimePickerMessages, messagesProp)
  const { date: dateWord, time: timeWord, ...timeMessages } = t
  const locale = localeProp ?? f.locale
  const labelId = useLabelFor(dateId)

  const [value, setValue] = useControllable<Date | null>({ value: valueProp, defaultValue, onChange: onValueChange })
  const [day, setDay] = React.useState<Date | null>(() => (value ? startOfDay(value) : null))
  const [time, setTime] = React.useState<TimeString | null>(() => timeOf(value))

  // A value set from outside replaces both halves, during render.
  const valueKey = value ? String(value.getTime()) : ''
  const [shownKey, setShownKey] = React.useState(valueKey)
  if (shownKey !== valueKey) {
    setShownKey(valueKey)
    setDay(value ? startOfDay(value) : null)
    setTime(timeOf(value))
  }

  const parts = parseTime(time)
  const moment = day && parts ? atTime(day, parts) : null
  const tooEarly = moment && min && moment < min
  const tooLate = moment && max && moment > max
  const momentText = (date: Date) =>
    `${formatMediumDate(date, locale)}, ${formatTime({ hour: date.getHours(), minute: date.getMinutes() }, locale, hourCycle)}`
  const rangeError = tooEarly
    ? f.format(t.tooEarly, { time: momentText(min) })
    : tooLate
      ? f.format(t.tooLate, { time: momentText(max) })
      : null

  function emit(nextDay: Date | null, nextTime: TimeString | null) {
    const nextParts = parseTime(nextTime)
    const next = nextDay && nextParts ? atTime(nextDay, nextParts) : null
    if (next && ((min && next < min) || (max && next > max))) return
    if (next === null ? value !== null : value?.getTime() !== next.getTime()) setValue(next)
  }

  const nameIds = joinIds(labelId, ariaLabelledBy, ariaLabel && !ariaLabelledBy ? groupId : undefined)
  const describedBy = joinIds(describedByProp, rangeError ? errorId : undefined)
  const invalid = Boolean(rangeError) || invalidProp === true || invalidProp === 'true' ? true : undefined

  return (
    <div
      role="group"
      id={groupId}
      data-slot="date-time-picker"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={labelId || ariaLabelledBy ? joinIds(labelId, ariaLabelledBy) : undefined}
      {...props}
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="flex flex-wrap items-start gap-2">
        <DatePicker
          id={dateId}
          aria-labelledby={joinIds(nameIds, dateWordId)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          wrapperClassName="min-w-0 flex-[1_1_10rem]"
          value={day}
          onValueChange={(next) => {
            setDay(next)
            emit(next, time)
          }}
          locale={locale}
          weekStartsOn={weekStartsOn}
          min={min ? startOfDay(min) : null}
          max={max ? startOfDay(max) : null}
          isDateDisabled={isDateDisabled}
          today={today}
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          size={size}
          disabled={disabled}
          required={required}
        />
        <TimePicker
          aria-labelledby={joinIds(nameIds, timeWordId)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          wrapperClassName="flex-[0_0_auto]"
          className="w-auto"
          value={time}
          onValueChange={(next) => {
            setTime(next)
            emit(day, next)
          }}
          locale={locale}
          hourCycle={hourCycle}
          minuteStep={minuteStep}
          size={size}
          disabled={disabled}
          required={required}
          messages={timeMessages}
        />
      </div>
      <span id={dateWordId} hidden>
        {dateWord}
      </span>
      <span id={timeWordId} hidden>
        {timeWord}
      </span>
      {rangeError ? <DateError id={errorId}>{rangeError}</DateError> : null}
      {name ? <input type="hidden" name={name} value={value ? toLocalDateTime(value) : ''} /> : null}
    </div>
  )
}
