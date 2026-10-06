/**
 * The date arithmetic the pickers need, and nothing more.
 *
 * ── no date library ──
 * The pickers deal in CALENDAR DAYS: a report period, a scheduled run. They
 * never need time zones, durations or recurrence, which are what date-fns,
 * Luxon or Temporal polyfills are for. Every value here is a plain `Date` at
 * local midnight, and the arithmetic is the handful of functions below, each
 * of which goes through `new Date(y, m, d)` so the engine handles month
 * lengths and leap years. Locale work — month and weekday names, the order of
 * day, month and year, the first day of the week — is `Intl`, which every
 * supported browser already ships. A library would add weight to every
 * consumer's bundle for a problem the platform has solved.
 *
 * ── no hidden locale ──
 * Every function that formats or parses takes a `locale`. `undefined` is a
 * valid value and means "the runtime's locale", exactly as it does for
 * `Intl` itself; nothing here quietly substitutes `en-US`.
 */

export type DateLocale = Intl.LocalesArgument

/** Midnight, local time, on the same calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/**
 * Same day of the month, `months` later — clamped to the last day when the
 * target month is shorter, so 31 January + 1 month is 28 or 29 February, not
 * 2 or 3 March. PageDown from the 31st should land in the next month.
 */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const last = daysInMonth(target)
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last))
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function daysInMonth(date: Date): number {
  return endOfMonth(date).getDate()
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return (
    !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** Negative, zero or positive, comparing calendar days only. */
export function compareDays(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime()
}

export function clampDay(date: Date, min?: Date | null, max?: Date | null): Date {
  if (min && compareDays(date, min) < 0) return startOfDay(min)
  if (max && compareDays(date, max) > 0) return startOfDay(max)
  return date
}

/** `yyyy-mm-dd`, for form submission and data attributes. Never shown to a person. */
export function toISODate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ── the week ───────────────────────────────────────────────────────── */

type WeekInfo = { firstDay: number }
type LocaleWithWeekInfo = Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo }

/**
 * The first day of the week for a locale, as a JS weekday (0 = Sunday).
 *
 * `Intl.Locale#getWeekInfo()` is the standard; some engines still ship it as
 * the older `weekInfo` getter, so both are read. Where neither exists (Firefox
 * at the time of writing) the answer is Monday — ISO 8601, the international
 * standard — rather than the Sunday of one locale. That is a documented
 * fallback for a missing API, not a locale default; a product that knows its
 * audience passes `weekStartsOn` and never reaches it.
 */
export function getWeekStart(locale: DateLocale): number {
  try {
    const tag = new Intl.DateTimeFormat(locale).resolvedOptions().locale
    const loc = new Intl.Locale(tag) as LocaleWithWeekInfo
    const info = loc.getWeekInfo?.() ?? loc.weekInfo
    if (info?.firstDay) return info.firstDay % 7
  } catch {
    // An engine without Intl.Locale falls through to ISO 8601.
  }
  return 1
}

/**
 * The seven weekdays in display order, from the given first day.
 *
 * `short` is what the column header shows. It is the locale's abbreviated
 * form unless any of the seven runs past four characters — Arabic's "short"
 * weekdays are the full words, and الخميس next to الجمعة overran a day-wide
 * column in the first build — in which case the narrow form is used for all
 * seven. The full name stays on the header's `abbr` for screen readers.
 */
export function weekdays(locale: DateLocale, weekStartsOn: number) {
  const format = (weekday: 'short' | 'narrow' | 'long') => new Intl.DateTimeFormat(locale, { weekday })
  const [short, narrow, long] = [format('short'), format('narrow'), format('long')]
  // 4 January 2026 is a Sunday: any known Sunday works as the origin.
  const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 4 + ((weekStartsOn + i) % 7)))
  const tooLong = days.some((day) => [...short.format(day)].length > 4)
  return days.map((day) => ({ short: (tooLong ? narrow : short).format(day), long: long.format(day) }))
}

/**
 * The month as rows of seven, `null` where a cell belongs to the month either
 * side. Days of neighbouring months are left blank rather than shown muted:
 * a muted 30 next to a bold 1 reads as "unavailable", which it is not.
 */
export function monthGrid(month: Date, weekStartsOn: number): (Date | null)[][] {
  const first = startOfMonth(month)
  const lead = (first.getDay() - weekStartsOn + 7) % 7
  const count = daysInMonth(month)
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= count; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export function startOfWeek(date: Date, weekStartsOn: number): Date {
  return addDays(date, -((date.getDay() - weekStartsOn + 7) % 7))
}

/* ── formatting and parsing ─────────────────────────────────────────── */

// Bidi controls that some locales put between the parts of a numeric date
// (ar-EG writes U+200F after each separator). They are invisible, so they are
// stripped before parsing and from the pattern a person is shown.
const BIDI_MARKS = /[‎‏؜‪-‮⁦-⁩]/g

const NUMERIC: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }

type Part = 'day' | 'month' | 'year'

export interface DatePattern {
  /** The order the locale writes the parts in. */
  order: Part[]
  /** What a person should type, e.g. `DD/MM/YYYY` or `MM/DD/YYYY`. */
  pattern: string
}

/**
 * The typed format for a locale, read from `formatToParts` rather than from a
 * table of locales — so it is right for any locale the engine knows, and the
 * guidance shown under the field can never disagree with what is accepted.
 * The letters are Latin (DD, MM, YYYY) in every locale: it is the convention
 * people recognise as a format, where translated letters are not.
 */
export function getDatePattern(locale: DateLocale): DatePattern {
  const parts = new Intl.DateTimeFormat(locale, NUMERIC).formatToParts(new Date(2026, 10, 23))
  const order: Part[] = []
  let separator = '/'
  for (const part of parts) {
    if (part.type === 'day' || part.type === 'month' || part.type === 'year') order.push(part.type)
    else if (part.type === 'literal' && order.length === 1) {
      separator = part.value.replace(BIDI_MARKS, '').trim() || separator
    }
  }
  const letters = { day: 'DD', month: 'MM', year: 'YYYY' } as const
  return { order, pattern: order.map((p) => letters[p]).join(separator) }
}

/** The numeric form typed into the input: `06/10/2026` in en-GB. */
export function formatInputDate(date: Date, locale: DateLocale): string {
  return new Intl.DateTimeFormat(locale, NUMERIC).format(date)
}

/** The long form read aloud and shown in messages: `Tuesday, 6 October 2026`. */
export function formatLongDate(date: Date, locale: DateLocale, weekday = true): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: weekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Medium form for a trigger with little room: `6 Oct 2026`. */
export function formatMediumDate(date: Date, locale: DateLocale): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatMonthYear(date: Date, locale: DateLocale): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

/** Day of the month in the locale's own digits: ٦ in ar-EG, 6 in en. */
export function formatDayNumber(date: Date, locale: DateLocale): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)
}

// Arabic-Indic (U+0660) and Extended Arabic-Indic (U+06F0) digits, so a
// person typing in their own digits is understood.
function toAsciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (c) => String((c.charCodeAt(0) & 0xf) % 10))
}

export type ParseResult = { ok: true; date: Date } | { ok: false; reason: 'format' | 'nonexistent' }

/**
 * Parse what a person typed, in the locale's order. Any run of non-digits is
 * a separator, so `6.10.2026`, `6-10-2026` and `6/10/2026` all work: the
 * separator is a habit, the order is the meaning. A two-digit year is read as
 * 20xx — the pickers schedule and report on this century.
 */
export function parseInputDate(text: string, locale: DateLocale): ParseResult {
  const clean = toAsciiDigits(text.replace(BIDI_MARKS, '')).trim()
  const numbers = clean.split(/\D+/).filter(Boolean)
  if (numbers.length !== 3) return { ok: false, reason: 'format' }
  const { order } = getDatePattern(locale)
  const value: Record<Part, number> = { day: 0, month: 0, year: 0 }
  order.forEach((part, i) => {
    value[part] = Number(numbers[i])
  })
  if (numbers[order.indexOf('year')]!.length === 2) value.year += 2000
  else if (numbers[order.indexOf('year')]!.length !== 4) return { ok: false, reason: 'format' }
  const date = new Date(value.year, value.month - 1, value.day)
  // 31/02 rolls over to 3 March in the Date constructor; a round trip that
  // does not match means the typed day does not exist.
  if (date.getFullYear() !== value.year || date.getMonth() !== value.month - 1 || date.getDate() !== value.day) {
    return { ok: false, reason: 'nonexistent' }
  }
  return { ok: true, date }
}

/* ── ranges ─────────────────────────────────────────────────────────── */

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface DateRangePreset {
  /** Visible label, e.g. "Last 7 days". */
  label: string
  /** The range relative to `today`, so presets are testable and never stale. */
  range: (today: Date) => { start: Date; end: Date }
}

/**
 * The presets an analytics screen reaches for. "Last 7 days" includes today:
 * it is the seven days you can see on the chart, ending now.
 */
export const defaultRangePresets: DateRangePreset[] = [
  { label: 'Last 7 days', range: (t) => ({ start: addDays(t, -6), end: t }) },
  { label: 'Last 30 days', range: (t) => ({ start: addDays(t, -29), end: t }) },
  { label: 'Last 90 days', range: (t) => ({ start: addDays(t, -89), end: t }) },
  { label: 'This month', range: (t) => ({ start: startOfMonth(t), end: t }) },
  {
    label: 'Last month',
    range: (t) => {
      const previous = addMonths(startOfMonth(t), -1)
      return { start: previous, end: endOfMonth(previous) }
    },
  },
]
