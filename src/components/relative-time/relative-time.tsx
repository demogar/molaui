'use client'

import * as React from 'react'

import { cn } from '../../lib/cn'
import { useMessagesLocale } from '../../lib/messages'
import { useHydrated } from '../../lib/use-hydrated'
import { type DateLocale } from '../date-picker/date-utils'

/**
 * A moment as its distance from now: "3 minutes ago", "in 2 days",
 * "yesterday". A `<time>` element, so the exact moment is in `dateTime` for
 * machines, and in `title` for a pointer.
 *
 * ── server rendering ──
 * The text depends on "now", and the server's now is not the browser's: it
 * was rendered a moment, or a cache lifetime, earlier. A component that
 * computed "3 minutes ago" on both would disagree with itself, and React 19
 * answers mismatched text by throwing the server HTML away. So there are two
 * ways to render it:
 *
 * - Pass `now`. The text is computed from it on the server and in the
 *   browser alike, and does not tick: the page owns time, and re-renders
 *   with a new `now` when it wants the text to move. This is also how
 *   stories and tests pin it.
 * - Omit `now`. The server and the hydrating render write the exact moment
 *   instead, in `timeZone` or in UTC with the zone named ("14 Oct 2026,
 *   09:12 UTC"), which is true wherever it is read and is a fine thing for a
 *   page without JavaScript to show. From the first render after hydration
 *   the text is relative and live, as the run clocks are (`useHydrated`).
 *
 * ── live, but not in a hidden tab ──
 * A live time schedules one timer for the moment its text would next change
 * (in a second under a minute, on the next minute under an hour, and so on),
 * not an interval: a table of 200 runs from yesterday wakes once an hour,
 * not 200 times a second. A hidden tab schedules nothing; when it is shown
 * again the time is re-read at once, so the first frame a person sees is
 * already right. `live={false}` reads the clock once, after hydration.
 *
 * ── it is not announced ──
 * The text changes on its own, so it is not a live region: a screen reader
 * that announced "4 minutes ago" every minute would bury everything else.
 * Someone who reaches it hears the current text.
 *
 * ── units ──
 * Seconds under a minute, then minutes, hours, days, weeks, months and years,
 * truncated rather than rounded: at 59 minutes it says "59 minutes ago", not
 * "1 hour ago", so it never claims more time has passed than has. The words
 * come from `Intl.RelativeTimeFormat` for `locale`, and `numeric="auto"`
 * gives "yesterday" and "now" where the locale has them.
 *
 * `className`, `ref` and the other DOM props go to the `<time>`.
 */

export interface RelativeTimeProps extends Omit<React.ComponentProps<'time'>, 'children' | 'dateTime'> {
  /** The moment: a `Date`, epoch milliseconds, or an ISO 8601 string. */
  date: Date | number | string
  /**
   * The moment to measure from. Given, the text renders on the server and does
   * not tick; omitted, it uses the browser's clock from hydration on.
   */
  now?: Date | number
  /** BCP 47 tag for the words and digits. Left out, `MessagesProvider`'s locale, then the runtime's. */
  locale?: DateLocale
  /** `long` "3 minutes ago", `short` "3 min. ago", `narrow` "3m ago" (in English). */
  format?: 'long' | 'short' | 'narrow'
  /** `auto` writes "yesterday" and "now" where the locale has them; `always` writes "1 day ago". */
  numeric?: 'auto' | 'always'
  /** The zone for the exact moment in `title`, and in the server text when `now` is omitted. */
  timeZone?: string
  /** Keep the text current while the tab is visible. Ignored when `now` is given. */
  live?: boolean
}

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30.436875 * DAY
const YEAR = 365.2425 * DAY

/** The largest unit the distance has reached, and that unit's length. */
function unitFor(distance: number): [Intl.RelativeTimeFormatUnit, number] {
  const abs = Math.abs(distance)
  if (abs < MINUTE) return ['second', SECOND]
  if (abs < HOUR) return ['minute', MINUTE]
  if (abs < DAY) return ['hour', HOUR]
  if (abs < WEEK) return ['day', DAY]
  if (abs < MONTH) return ['week', WEEK]
  if (abs < YEAR) return ['month', MONTH]
  return ['year', YEAR]
}

/**
 * "3 minutes ago" for `date` seen from `now`. Exported for tables and other
 * places that need the words without the element.
 */
export function formatRelativeTime(
  date: Date | number | string,
  now: Date | number,
  { locale, format = 'long', numeric = 'auto' }: Pick<RelativeTimeProps, 'locale' | 'format' | 'numeric'> = {},
): string {
  const distance = toTime(date) - +now
  const [unit, size] = unitFor(distance)
  // Truncate towards zero, and turn -0 into 0 so "now" is not "0 seconds ago".
  const count = Math.trunc(distance / size) || 0
  return new Intl.RelativeTimeFormat(locale, { style: format, numeric }).format(count, unit)
}

/** Milliseconds until `formatRelativeTime(date, now)` would read differently. */
export function msUntilChange(date: Date | number | string, now: Date | number): number {
  const distance = +now - toTime(date)
  const [, size] = unitFor(distance)
  const into = Math.abs(distance) % size
  // Past moments grow away from now; future ones shrink towards it.
  const wait = distance >= 0 ? size - into : into || size
  // Never sooner than a frame, never later than an hour (month and year
  // lengths are averages, so a long sleep could miss the true boundary).
  return Math.min(Math.max(Math.ceil(wait), 16), HOUR)
}

function toTime(date: Date | number | string): number {
  return typeof date === 'number' ? date : typeof date === 'string' ? Date.parse(date) : date.getTime()
}

function absolute(date: number, locale: DateLocale, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone ?? 'UTC',
  }).format(date) + (timeZone ? '' : ' UTC')
}

function useClock(target: number, enabled: boolean, live: boolean): number {
  const [clock, setClock] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      clearTimeout(timer)
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      setClock(now)
      if (live) timer = setTimeout(tick, msUntilChange(target, now))
    }
    tick()
    if (!live) return
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [target, enabled, live])
  return clock
}

export function RelativeTime({
  date,
  now,
  locale: localeProp,
  format = 'long',
  numeric = 'auto',
  timeZone,
  live = true,
  className,
  title,
  ...props
}: RelativeTimeProps) {
  const providerLocale = useMessagesLocale()
  const locale = localeProp ?? providerLocale
  const target = toTime(date)
  const hydrated = useHydrated()
  const clock = useClock(target, now === undefined && hydrated, live)
  const valid = Number.isFinite(target)
  const reference = now ?? (hydrated ? clock : undefined)

  let text = ''
  if (valid) {
    text =
      reference === undefined
        ? absolute(target, locale, timeZone)
        : formatRelativeTime(target, reference, { locale, format, numeric })
  }
  // The exact moment in the reader's zone is known only in the browser.
  const exact = valid && (timeZone !== undefined || hydrated) ? absolute(target, locale, timeZone ?? localZone()) : undefined

  return (
    <time
      data-slot="relative-time"
      dateTime={valid ? new Date(target).toISOString() : undefined}
      title={title ?? exact}
      className={cn('tabular', className)}
      {...props}
    >
      {text}
    </time>
  )
}

function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
