'use client'

import { useDirection } from '@base-ui/react/direction-provider'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { IconButton } from '../button'
import {
  addDays,
  addMonths,
  addYears,
  clampDay,
  compareDays,
  type DateLocale,
  type DateRange,
  formatDayNumber,
  formatLongDate,
  formatMonthYear,
  getWeekStart,
  isSameDay,
  monthGrid,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toISODate,
  weekdays,
} from './date-utils'

/**
 * A month grid that follows the WAI-ARIA APG date picker dialog pattern.
 *
 * Base UI has no calendar primitive, so this is the one widget in the system
 * that owns its own keyboard model. It keeps to the APG one exactly, because a
 * screen-reader user who has met one date grid expects every other to move
 * the same way: arrows by day and week, PageUp/PageDown by month (with Shift,
 * by year), Home/End to the edges of the week, Enter or Space to choose.
 *
 * ── roving focus on the cell, not a button inside it ──
 * The focusable thing is the `gridcell` itself, carrying `aria-selected` and
 * `aria-current`. A button inside the cell would be what is focused and
 * announced, and the cell's selected state — which lives on the cell, where
 * the grid role needs it — would never be read.
 *
 * ── left and right follow the reading direction ──
 * In RTL the week runs right to left, so ArrowLeft is "next day". The
 * direction comes from Base UI's `DirectionProvider`, the same context the
 * slider and tabs read, rather than from the DOM, so a calendar in a portal
 * still knows which way it reads.
 *
 * ── state is a mark, a word and a colour ──
 * Today carries a dot under its number and "today" in its accessible name.
 * The selected day is an ink fill. In a range the two ends are ink fills
 * with an oro edge on their outer side, and the days between are a wash —
 * so start, end and inside are three different shapes, not three tints.
 * An unavailable day is struck through and named "unavailable"; it stays
 * reachable by arrow keys, because skipping it would make the grid jump
 * and lose a sighted keyboard user's place.
 */

export interface CalendarProps {
  /** The selected day, or the range. A single date is a range whose ends match. */
  selected?: DateRange
  /** Called with the day a person chose. Range logic belongs to the caller. */
  onSelect?: (date: Date) => void
  /** Where focus starts. Defaults to the selected day, else today. */
  defaultFocusedDate?: Date | null
  /**
   * Show this day's month and move the tab stop to it, without moving focus —
   * for a date typed elsewhere that the grid should follow. Compared by
   * identity, so a new `Date` for the same day shows it again after the
   * person has paged away.
   */
  visibleDate?: Date | null
  /** Inject "now" for stable stories and tests. */
  today?: Date
  min?: Date | null
  max?: Date | null
  /** Days that exist but cannot be chosen: weekends in a freeze, public holidays. */
  isDateDisabled?: (date: Date) => boolean
  /** BCP 47 tag. `undefined` uses the runtime's locale, as Intl does. */
  locale?: DateLocale
  /** 0 = Sunday … 6 = Saturday. Overrides the locale's first day of the week. */
  weekStartsOn?: number
  /** Move focus to the active day when the calendar mounts — for a popup that has just opened. */
  autoFocus?: boolean
  /** Ref to the day cell that holds the roving tab stop. */
  activeCellRef?: React.Ref<HTMLTableCellElement>
  /** Id for the month heading, so a dialog can be named by it. */
  headingId?: string
  /** Render the heading as the popup's title instead of a plain element. */
  renderHeading?: (props: { id: string; className: string; children: React.ReactNode }) => React.ReactNode
  className?: string
}

export function Calendar({
  selected,
  onSelect,
  defaultFocusedDate,
  visibleDate,
  today: todayProp,
  min,
  max,
  isDateDisabled,
  locale,
  weekStartsOn: weekStartsOnProp,
  autoFocus = false,
  activeCellRef,
  headingId: headingIdProp,
  renderHeading,
  className,
}: CalendarProps) {
  const direction = useDirection()
  const uid = React.useId()
  const headingId = headingIdProp ?? `${uid}-heading`
  const today = startOfDay(todayProp ?? new Date())
  const weekStartsOn = weekStartsOnProp ?? getWeekStart(locale)

  const [focused, setFocused] = React.useState(() =>
    clampDay(startOfDay(defaultFocusedDate ?? selected?.start ?? today), min, max),
  )
  // Followed during render rather than in an effect, so the grid never
  // paints a frame of the old month after a typed date. Remounting with a new
  // `key` would be simpler, but a blur that commits a typed date fires on
  // pointer-down, and a remount would swap the day cell out from under the
  // click that caused the blur.
  const [shownVisible, setShownVisible] = React.useState(visibleDate)
  if (visibleDate !== shownVisible) {
    setShownVisible(visibleDate)
    if (visibleDate) setFocused(clampDay(startOfDay(visibleDate), min, max))
  }
  const gridRef = React.useRef<HTMLTableElement>(null)
  // Set by keyboard moves: after the render that shows the new day, focus it.
  // Pressing previous/next month changes the month without stealing focus
  // from the button that was pressed.
  const moveFocus = React.useRef(autoFocus)

  React.useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${toISODate(focused)}"]`)?.focus()
  }, [focused])

  const disabled = (date: Date) =>
    (min != null && compareDays(date, min) < 0) ||
    (max != null && compareDays(date, max) > 0) ||
    (isDateDisabled?.(date) ?? false)

  function move(next: Date) {
    moveFocus.current = true
    setFocused(clampDay(next, min, max))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTableElement>) {
    const forward = direction === 'rtl' ? -1 : 1
    switch (event.key) {
      case 'ArrowRight':
        move(addDays(focused, forward))
        break
      case 'ArrowLeft':
        move(addDays(focused, -forward))
        break
      case 'ArrowDown':
        move(addDays(focused, 7))
        break
      case 'ArrowUp':
        move(addDays(focused, -7))
        break
      case 'PageDown':
        move(event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1))
        break
      case 'PageUp':
        move(event.shiftKey ? addYears(focused, -1) : addMonths(focused, -1))
        break
      case 'Home':
        move(startOfWeek(focused, weekStartsOn))
        break
      case 'End':
        move(addDays(startOfWeek(focused, weekStartsOn), 6))
        break
      case 'Enter':
      case ' ':
        if (!disabled(focused)) onSelect?.(focused)
        break
      default:
        return
    }
    event.preventDefault()
  }

  const month = startOfMonth(focused)
  const prevMonth = addMonths(month, -1)
  const nextMonth = addMonths(month, 1)
  const canGoBack = !min || compareDays(month, startOfMonth(min)) > 0
  const canGoForward = !max || compareDays(nextMonth, max) <= 0

  const start = selected?.start ?? null
  const end = selected?.end ?? null
  const isRange = !!start && !!end && !isSameDay(start, end)

  const headingClass = 'm-0 flex-1 text-center font-ui text-sm font-semibold text-ink'
  const headingText = formatMonthYear(month, locale)

  return (
    <div data-slot="calendar" className={cn('grid w-max gap-2', className)}>
      <div className="flex items-center gap-2">
        <IconButton
          variant="ghost"
          size="sm"
          label={`Previous month, ${formatMonthYear(prevMonth, locale)}`}
          disabled={!canGoBack}
          onClick={() => setFocused(clampDay(addMonths(focused, -1), min, max))}
        >
          <ChevronLeft className="rtl:-scale-x-100" />
        </IconButton>
        {/* Polite, so paging through months is announced without stealing the
            day the person is on. */}
        {renderHeading ? (
          renderHeading({ id: headingId, className: headingClass, children: headingText })
        ) : (
          <h2 id={headingId} aria-live="polite" className={headingClass}>
            {headingText}
          </h2>
        )}
        <IconButton
          variant="ghost"
          size="sm"
          label={`Next month, ${formatMonthYear(nextMonth, locale)}`}
          disabled={!canGoForward}
          onClick={() => setFocused(clampDay(addMonths(focused, 1), min, max))}
        >
          <ChevronRight className="rtl:-scale-x-100" />
        </IconButton>
      </div>

      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={headingId}
        onKeyDown={onKeyDown}
        className="border-collapse"
      >
        <thead>
          <tr>
            {weekdays(locale, weekStartsOn).map((day) => (
              <th
                key={day.long}
                scope="col"
                abbr={day.long}
                className="h-7 w-(--control-h) p-0 text-center text-2xs font-semibold text-ink-muted"
              >
                {day.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month, weekStartsOn).map((week, w) => (
            <tr key={w}>
              {week.map((date, d) => {
                if (!date) return <td key={d} className="p-0" />
                const isActive = isSameDay(date, focused)
                const isToday = isSameDay(date, today)
                const isStart = isSameDay(date, start)
                const isEnd = isSameDay(date, end)
                const isEndpoint = isStart || isEnd
                const isInside = isRange && compareDays(date, start!) > 0 && compareDays(date, end!) < 0
                const isDisabled = disabled(date)
                const words = [
                  formatLongDate(date, locale),
                  isToday ? 'today' : null,
                  isRange && isStart ? 'range start' : null,
                  isRange && isEnd ? 'range end' : null,
                  isDisabled ? 'unavailable' : null,
                ].filter(Boolean)
                return (
                  <td
                    key={d}
                    ref={isActive ? activeCellRef : undefined}
                    role="gridcell"
                    data-date={toISODate(date)}
                    tabIndex={isActive ? 0 : -1}
                    aria-selected={isEndpoint || isInside}
                    aria-current={isToday ? 'date' : undefined}
                    aria-disabled={isDisabled || undefined}
                    data-range={isRange ? (isStart ? 'start' : isEnd ? 'end' : isInside ? 'inside' : undefined) : undefined}
                    onClick={() => {
                      moveFocus.current = true
                      setFocused(date)
                      if (!isDisabled) onSelect?.(date)
                    }}
                    className={cn(
                      'relative size-(--control-h) p-0 text-center align-middle font-ui text-sm tabular-nums text-ink',
                      'cursor-default outline-none select-none',
                      'transition-[background-color,color] duration-(--motion-cut) ease-cut',
                      'hover:bg-ink-soft',
                      isToday && 'font-bold',
                      isInside && 'bg-ink-soft forced-selected',
                      isEndpoint && 'bg-ink text-on-ink hover:bg-ink forced-selected',
                      isDisabled && 'cursor-not-allowed text-ink-muted line-through hover:bg-transparent',
                      // Focus sits above the neighbouring cells' fills.
                      'focus-visible:z-10 focus-visible:shadow-[var(--focus-ring)]',
                    )}
                  >
                    <span aria-hidden>{formatDayNumber(date, locale)}</span>
                    <span className="sr-only">{words.join(', ')}</span>
                    {isToday ? (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute inset-x-0 bottom-1 mx-auto size-1 rounded-full',
                          isEndpoint ? 'bg-on-ink forced-on-selected' : 'bg-ink forced-ink',
                        )}
                      />
                    ) : null}
                    {isRange && isStart ? (
                      <span aria-hidden className="absolute inset-y-0 start-0 w-[3px] bg-oro forced-on-selected" />
                    ) : null}
                    {isRange && isEnd ? (
                      <span aria-hidden className="absolute inset-y-0 end-0 w-[3px] bg-oro forced-on-selected" />
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

