import { type DateLocale } from '../date-picker/date-utils'

/**
 * A time of day as `HH:mm`, 24-hour, zero-padded: the value of a native
 * `<input type="time">`. A string rather than a `Date` because a time of day
 * has no date and no zone, and a `Date` would carry both and invite one of
 * them to leak into the other.
 */
export type TimeString = string

export interface TimeParts {
  hour: number
  minute: number
}

/** `'09:30'` → `{ hour: 9, minute: 30 }`; anything else → `null`. */
export function parseTime(value: string | null | undefined): TimeParts | null {
  const match = value ? /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value) : null
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

export function toTimeString({ hour, minute }: TimeParts): TimeString {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** Minutes since midnight, for comparing two times. */
export function minutesOf({ hour, minute }: TimeParts): number {
  return hour * 60 + minute
}

export type TimeSegment = 'hour' | 'minute' | 'dayPeriod'

export interface TimeLayout {
  /** The segments in the locale's order: `dayPeriod` comes first in Korean. */
  order: TimeSegment[]
  /** The text before each segment, and after the last: `['', ':', ' ', '']` for `9:05 PM`. */
  literals: string[]
  /** `h12` shows 1–12, `h11` shows 0–11 (as in some Japanese usage), `h23` shows 0–23. */
  hourCycle: 'h11' | 'h12' | 'h23'
  /** The locale's names for before and after noon: `['AM', 'PM']`, `['a. m.', 'p. m.']`. */
  dayPeriods: [string, string]
  /** Whether the locale writes nine o'clock as `09` (en-GB) or `9` (en-US). */
  padHour: boolean
}

/**
 * Everything locale-specific about writing a time, read from `Intl` rather
 * than from a table: whether the clock is 12- or 24-hour (es-PA writes
 * `9:05 p. m.`, es-ES `21:05`), where the day period goes, and what separates
 * the hour from the minute (`21.05` in Finnish).
 *
 * Read from a fixed instant in UTC, so the layout never depends on the zone
 * the code runs in.
 */
export function getTimeLayout(locale: DateLocale, hourCycle?: 12 | 24): TimeLayout {
  const options: Intl.DateTimeFormatOptions = { timeStyle: 'short', timeZone: 'UTC' }
  if (hourCycle) options.hourCycle = hourCycle === 12 ? 'h12' : 'h23'
  const format = new Intl.DateTimeFormat(locale, options)
  const resolved = format.resolvedOptions().hourCycle
  const cycle: TimeLayout['hourCycle'] = resolved === 'h11' ? 'h11' : resolved === 'h12' ? 'h12' : 'h23'

  const order: TimeSegment[] = []
  const literals: string[] = ['']
  for (const part of format.formatToParts(Date.UTC(2026, 0, 1, 21, 5))) {
    if (part.type === 'hour' || part.type === 'minute' || part.type === 'dayPeriod') {
      if (order.includes(part.type)) continue
      order.push(part.type)
      literals.push('')
    } else {
      literals[literals.length - 1] += part.value
    }
  }
  const partAt = (hour: number, type: Intl.DateTimeFormatPartTypes) =>
    format.formatToParts(Date.UTC(2026, 0, 1, hour, 5)).find((part) => part.type === type)?.value ?? ''
  return {
    order,
    literals,
    hourCycle: cycle,
    dayPeriods: [partAt(9, 'dayPeriod'), partAt(21, 'dayPeriod')],
    padHour: partAt(9, 'hour').length > 1,
  }
}

/** The hours a segment shows, by cycle. */
export function hourRange(cycle: TimeLayout['hourCycle']): [number, number] {
  if (cycle === 'h12') return [1, 12]
  if (cycle === 'h11') return [0, 11]
  return [0, 23]
}

/** A 24-hour value as the hour segment and the day period show it. */
export function toDisplayHour(hour: number, cycle: TimeLayout['hourCycle']): { hour: number; period: 0 | 1 } {
  const period: 0 | 1 = hour >= 12 ? 1 : 0
  if (cycle === 'h12') return { hour: hour % 12 || 12, period }
  if (cycle === 'h11') return { hour: hour % 12, period }
  return { hour, period }
}

/** The hour segment and the day period, back to 24 hours. */
export function fromDisplayHour(hour: number, period: 0 | 1, cycle: TimeLayout['hourCycle']): number {
  if (cycle === 'h23') return hour
  return (hour % 12) + period * 12
}

/** `9:30 PM`, `21:30`: a time as the locale writes it, for sentences and names. */
export function formatTime(value: TimeParts, locale: DateLocale, hourCycle?: 12 | 24): string {
  const options: Intl.DateTimeFormatOptions = { timeStyle: 'short', timeZone: 'UTC' }
  if (hourCycle) options.hourCycle = hourCycle === 12 ? 'h12' : 'h23'
  return new Intl.DateTimeFormat(locale, options).format(Date.UTC(2026, 0, 1, value.hour, value.minute))
}

/** A time on a calendar day, local time: how DateTimePicker builds its `Date`. */
export function atTime(day: Date, time: TimeParts): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hour, time.minute)
}

/** `yyyy-mm-ddThh:mm`, the value of a native `<input type="datetime-local">`. */
export function toLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
