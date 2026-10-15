'use client'

import { Clock } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { joinIds, mergeProps } from '../../lib/merge-props'
import { useControllable } from '../../lib/use-controllable'
import { useLabelFor } from '../../lib/use-label-for'
import { DateError } from '../date-picker/date-picker'
import { type DateLocale } from '../date-picker/date-utils'
import { type FieldControlSize, fieldControlSizes } from '../field/field-control'
import {
  formatTime,
  fromDisplayHour,
  getTimeLayout,
  hourRange,
  minutesOf,
  parseTime,
  type TimeLayout,
  type TimeSegment,
  type TimeString,
  toDisplayHour,
  toTimeString,
} from './time-utils'

/**
 * A time of day, entered as segments: an hour, a minute and, where the locale
 * keeps a 12-hour clock, a day period. Each segment is a `spinbutton`.
 *
 * ── why spinbuttons, and not a list of times ──
 * A listbox of times (09:00, 09:15, 09:30…) was the other model, and the one
 * a select-style picker uses. It fixes a granularity the field may not have,
 * so 09:10 cannot be entered at all with a 15-minute list; at one-minute
 * granularity it is 1,440 options, which nobody arrows through; and it reads
 * every time to a screen reader as one long list. A time is two small bounded
 * numbers, and the APG spinbutton is the pattern for exactly that: Up and
 * Down step, Home and End jump to the ends, digits type the value, and each
 * segment announces "Hour, 9" with its own name. A free-text field was the
 * third option and was rejected for the same reason DatePicker types a
 * pattern rather than prose: "930" is ambiguous, "9:30" is not, and the
 * segments make the ambiguous entry impossible.
 *
 * ── why not `<input type="time">` ──
 * The native control is accessible, but it follows the browser's locale
 * rather than the `locale` this page passes, so an es-PA page in an en-GB
 * browser shows a 24-hour clock beside dates written the Panamanian way;
 * and its segments cannot be styled, so it cannot wear the cut.
 *
 * ── each segment is an `<input>` ──
 * A focusable `<span>` was tried first, as some libraries do. A span brings
 * up no keyboard on a phone, so a touch user could neither type nor step.
 * An `<input role="spinbutton" inputmode="numeric">` brings up the number
 * pad, takes a `<label for>` (the first segment gets `id`, so a `Field`
 * label focuses it), and `spinbutton` is an allowed role for a text input.
 * Each segment is its own tab stop, as in React Aria's time field: there is
 * no roving focus to re-implement, and Left and Right also move between
 * segments. The segments run left to right in every direction, because a
 * time is written that way in right-to-left scripts too.
 *
 * ── typing ──
 * A digit replaces the segment and moves on as soon as no further digit
 * could fit: "9" in the hour moves to the minute, "1" waits for a second
 * digit, because 10, 11 and 12 are still possible. A separator (":") moves
 * on too, and Backspace empties a segment, or moves back from an empty one.
 * In the day period, the first letter of the locale's own word ("a", "p")
 * chooses it.
 *
 * ── the value commits on blur or Enter ──
 * As in DatePicker: the segments are a draft until focus leaves the field.
 * Typing "1" then "4" would otherwise report 01:30 and then 14:30, and the
 * first is not a time anyone chose. A draft that cannot be a time is stated,
 * not discarded: "Enter the hour and the minutes", "Choose 9:00 AM or later",
 * with the same mark and `role="alert"` as Field's error, and the value
 * stays what it was.
 *
 * ── where the props go ──
 * `className`, `ref` and the other DOM props go to the field, the element
 * with the cut and `role="group"`; `id` goes to the first segment, so a
 * `<label for>` focuses it. The outer element that also holds the error
 * takes `wrapperClassName`.
 */

export interface TimePickerMessages {
  hour: string
  minute: string
  dayPeriod: string
  /** What a screen reader hears for a segment with nothing in it. */
  empty: string
  incomplete: string
  /** `formatted` is `min` as the locale writes it. */
  tooEarly: (formatted: string) => string
  /** `formatted` is `max` as the locale writes it. */
  tooLate: (formatted: string) => string
}

const DEFAULT_MESSAGES: TimePickerMessages = {
  hour: 'Hour',
  minute: 'Minute',
  dayPeriod: 'AM/PM',
  empty: 'Empty',
  incomplete: 'Enter the hour and the minutes.',
  tooEarly: (formatted) => `Choose ${formatted} or later.`,
  tooLate: (formatted) => `Choose ${formatted} or earlier.`,
}

export interface TimePickerProps
  extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children' | 'role'> {
  /** `HH:mm`, 24-hour, as `<input type="time">` writes it; `null` for none. */
  value?: TimeString | null
  defaultValue?: TimeString | null
  /** Called on blur or Enter with a complete, allowed time, or `null` when emptied. */
  onValueChange?: (value: TimeString | null) => void
  /** BCP 47 tag for the clock (12- or 24-hour), the day-period words and the digits. `undefined` uses the runtime's locale. */
  locale?: DateLocale
  /** Overrides the locale's clock, for a product that always shows one. */
  hourCycle?: 12 | 24
  /** Minutes per Up or Down press in the minute segment; typing still takes any minute. */
  minuteStep?: number
  /** The earliest allowed time, `HH:mm`. */
  min?: TimeString | null
  /** The latest allowed time, `HH:mm`. */
  max?: TimeString | null
  /** Submitted as `HH:mm`, whatever the display locale. */
  name?: string
  size?: FieldControlSize
  disabled?: boolean
  required?: boolean
  /** Given to the first segment, so a `<label for>` (as `Field` writes it) focuses it. */
  id?: string
  /** The segment names and the sentences, for translation. */
  messages?: Partial<TimePickerMessages>
  /** Classes for the outer element that holds the field and its error. */
  wrapperClassName?: string
}

interface Draft {
  hour: number | null
  minute: number | null
  period: 0 | 1 | null
}

function toDraft(value: TimeString | null | undefined, layout: TimeLayout): Draft {
  const parts = parseTime(value)
  if (!parts) return { hour: null, minute: null, period: null }
  const { hour, period } = toDisplayHour(parts.hour, layout.hourCycle)
  return { hour, minute: parts.minute, period: layout.order.includes('dayPeriod') ? period : null }
}

const PART: Record<TimeSegment, string> = { hour: 'hour', minute: 'minute', dayPeriod: 'day-period' }

const segmentClasses = cn(
  'h-full min-w-0 border-0 bg-transparent p-0 text-center tabular [font-size:inherit] text-ink',
  'outline-none placeholder:text-ink-muted selection:bg-transparent',
  'focus:bg-selected focus:text-ink focus:forced-selected focus:shadow-none',
  'disabled:cursor-not-allowed disabled:text-ink-muted',
)

export function TimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  locale,
  hourCycle,
  minuteStep = 1,
  min,
  max,
  name,
  size = 'md',
  disabled,
  required,
  id,
  messages: messagesProp,
  className,
  wrapperClassName,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': describedByProp,
  'aria-invalid': invalidProp,
  ...props
}: TimePickerProps) {
  const uid = React.useId()
  const groupId = `${uid}-group`
  const errorId = `${uid}-error`
  const messages = { ...DEFAULT_MESSAGES, ...messagesProp }
  const layout = React.useMemo(() => getTimeLayout(locale, hourCycle), [locale, hourCycle])
  const [lo, hi] = hourRange(layout.hourCycle)
  const twelve = layout.order.includes('dayPeriod')
  const step = Math.max(1, Math.floor(minuteStep))
  const lastMinute = 59 - (59 % step)

  const [value, setValue] = useControllable<TimeString | null>({ value: valueProp, defaultValue, onChange: onValueChange })
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(value, layout))
  const [pending, setPending] = React.useState<{ segment: TimeSegment; text: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const segmentRefs = React.useRef<Partial<Record<TimeSegment, HTMLInputElement | null>>>({})
  const firstId = id ?? `${uid}-${layout.order[0]}`
  const labelId = useLabelFor(firstId)

  // A value set from outside replaces the draft, adjusted during render as
  // DatePicker does, so the field never paints a frame with the old time.
  const valueKey = `${value ?? ''}|${layout.hourCycle}|${layout.order.join()}`
  const [shownKey, setShownKey] = React.useState(valueKey)
  if (shownKey !== valueKey) {
    setShownKey(valueKey)
    setDraft(toDraft(value, layout))
    setPending(null)
  }

  const digits = React.useMemo(() => {
    const two = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false })
    const one = new Intl.NumberFormat(locale, { useGrouping: false })
    return { two: (n: number) => two.format(n), one: (n: number) => one.format(n) }
  }, [locale])

  function commit(next: Draft = draft) {
    const filled = [next.hour, next.minute, ...(twelve ? [next.period] : [])]
    if (filled.every((part) => part === null)) {
      setError(null)
      setValue(null)
      return
    }
    if (filled.some((part) => part === null)) {
      setError(messages.incomplete)
      return
    }
    const time = { hour: fromDisplayHour(next.hour!, next.period ?? 0, layout.hourCycle), minute: next.minute! }
    const earliest = parseTime(min)
    const latest = parseTime(max)
    if (earliest && minutesOf(time) < minutesOf(earliest)) {
      setError(messages.tooEarly(formatTime(earliest, locale, hourCycle)))
      return
    }
    if (latest && minutesOf(time) > minutesOf(latest)) {
      setError(messages.tooLate(formatTime(latest, locale, hourCycle)))
      return
    }
    setError(null)
    setValue(toTimeString(time))
  }

  function focusAt(index: number) {
    const segment = layout.order[index]
    if (segment) segmentRefs.current[segment]?.focus()
  }

  function update(segment: TimeSegment, part: number | null) {
    const key = segment === 'dayPeriod' ? 'period' : segment
    setDraft((current) => ({ ...current, [key]: part }))
  }

  function typeDigit(segment: 'hour' | 'minute', digit: string, index: number) {
    const [low, high] = segment === 'hour' ? [lo, hi] : [0, 59]
    let text = (pending?.segment === segment ? pending.text : '') + digit
    if (Number(text) > high || text.length > 2) text = digit
    const n = Number(text)
    update(segment, n >= low ? n : null)
    if (text.length === 2 || n * 10 > high) {
      setPending(null)
      focusAt(index + 1)
    } else {
      setPending({ segment, text })
    }
  }

  function stepped(segment: TimeSegment, delta: 1 | -1): number {
    if (segment === 'dayPeriod') {
      return draft.period === null ? (delta > 0 ? 0 : 1) : 1 - draft.period
    }
    if (segment === 'hour') {
      if (draft.hour === null) return delta > 0 ? lo : hi
      const next = draft.hour + delta
      return next > hi ? lo : next < lo ? hi : next
    }
    if (draft.minute === null) return delta > 0 ? 0 : lastMinute
    const next = delta > 0 ? (Math.floor(draft.minute / step) + 1) * step : (Math.ceil(draft.minute / step) - 1) * step
    return next > 59 ? 0 : next < 0 ? lastMinute : next
  }

  function onSegmentKeyDown(segment: TimeSegment, index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    const { key } = event
    if (event.metaKey || event.ctrlKey || event.altKey || key === 'Tab') return
    const current = segment === 'dayPeriod' ? draft.period : draft[segment]
    const handled = () => event.preventDefault()

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      handled()
      setPending(null)
      update(segment, stepped(segment, key === 'ArrowUp' ? 1 : -1))
    } else if (key === 'Home' || key === 'End') {
      handled()
      setPending(null)
      const ends: Record<TimeSegment, [number, number]> = { hour: [lo, hi], minute: [0, lastMinute], dayPeriod: [0, 1] }
      update(segment, ends[segment][key === 'Home' ? 0 : 1])
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      handled()
      focusAt(index + (key === 'ArrowLeft' ? -1 : 1))
    } else if (key === 'Backspace' || key === 'Delete') {
      handled()
      if (current === null && pending?.segment !== segment) {
        if (key === 'Backspace') focusAt(index - 1)
        return
      }
      setPending(null)
      update(segment, null)
    } else if (key === 'Enter') {
      handled()
      commit()
    } else if (key.length === 1) {
      handled()
      typeKey(segment, index, key)
    }
  }

  function typeKey(segment: TimeSegment, index: number, key: string) {
    if (segment !== 'dayPeriod' && /^\d$/.test(key)) {
      typeDigit(segment, key, index)
      return
    }
    if (segment === 'dayPeriod') {
      const initial = (word: string) => word.replace(/[^\p{L}]/gu, '').charAt(0).toLocaleLowerCase()
      const typed = key.toLocaleLowerCase()
      const [am, pm] = layout.dayPeriods.map(initial)
      const period = typed === am ? 0 : typed === pm ? 1 : null
      if (period !== null && am !== pm) {
        update('dayPeriod', period)
        focusAt(index + 1)
        return
      }
    }
    // A separator moves on, as typing "9:30" across the segments expects.
    if (layout.literals.join('').includes(key) || key === ':' || key === '.') {
      setPending(null)
      focusAt(index + 1)
    }
  }

  function display(segment: TimeSegment): string {
    if (segment === 'dayPeriod') return draft.period === null ? '' : layout.dayPeriods[draft.period]
    const part = draft[segment]
    if (part === null) return pending?.segment === segment ? pending.text : ''
    return segment === 'minute' || layout.padHour ? digits.two(part) : digits.one(part)
  }

  const invalid = Boolean(error) || invalidProp === true || invalidProp === 'true'
  const describedBy = joinIds(describedByProp, error ? errorId : undefined)
  // The group is named by the label, or by the caller's name for it; each
  // segment by the same, followed by its own word, read off its aria-label.
  const nameIds = joinIds(labelId, ariaLabelledBy, ariaLabel && !ariaLabelledBy ? groupId : undefined)
  const segmentLabel: Record<TimeSegment, string> = {
    hour: messages.hour,
    minute: messages.minute,
    dayPeriod: messages.dayPeriod,
  }
  const periodWidth = Math.max(...layout.dayPeriods.map((word) => word.length), 2) + 1

  return (
    <div data-slot="time-picker" className={cn('flex flex-col gap-2', wrapperClassName)}>
      <div
        // The consumer's handlers are merged with these, and run first.
        {...mergeProps<'div'>(
          {
            onBlur: (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commit()
            },
            onPointerDown: (event) => {
              // Pressing the box or the icon focuses the first empty segment,
              // or the last one, as pressing a native input's padding would.
              if ((event.target as HTMLElement).closest('input') || disabled) return
              event.preventDefault()
              const segments = [...event.currentTarget.querySelectorAll<HTMLInputElement>('input[role="spinbutton"]')]
              ;(segments.find((input) => !input.value) ?? segments.at(-1))?.focus()
            },
          },
          props,
        )}
        role="group"
        id={groupId}
        data-slot="time-picker-field"
        data-disabled={disabled ? '' : undefined}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={labelId || ariaLabelledBy ? joinIds(labelId, ariaLabelledBy) : undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full min-w-0 rounded-none bg-cloth-pale font-ui text-ink',
          'shadow-cut band-accent [--cut-reveal:3px] transition-[box-shadow,background-color] hover:cut-band',
          fieldControlSizes[size],
          'flex items-center gap-2 cursor-text',
          'focus-within:focus-ring focus-within:hover:focus-ring',
          'has-[[aria-invalid=true]]:band-danger has-[[aria-invalid=true]]:cut-band',
          'has-[[aria-invalid=true]]:focus-within:cut-band-focus',
          'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
          '[&_svg]:size-(--icon) [&_svg]:shrink-0',
          className,
        )}
      >
        <span dir="ltr" className="flex h-[calc(100%-6px)] min-w-0 items-stretch">
          {layout.literals[0] ? <span aria-hidden className="self-center whitespace-pre">{layout.literals[0]}</span> : null}
          {layout.order.map((segment, index) => {
            const segmentId = index === 0 ? firstId : `${uid}-${segment}`
            const part = segment === 'dayPeriod' ? draft.period : draft[segment]
            const [low, high] = segment === 'hour' ? [lo, hi] : segment === 'minute' ? [0, 59] : [0, 1]
            const shown = display(segment)
            return (
              <React.Fragment key={segment}>
                <input
                  ref={(node) => {
                    segmentRefs.current[segment] = node
                  }}
                  id={segmentId}
                  type="text"
                  role="spinbutton"
                  data-part={PART[segment]}
                  inputMode={segment === 'dayPeriod' ? 'text' : 'numeric'}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={segmentLabel[segment]}
                  aria-labelledby={joinIds(nameIds, segmentId)}
                  aria-describedby={index === 0 ? describedBy : undefined}
                  aria-valuemin={low}
                  aria-valuemax={high}
                  aria-valuenow={part ?? undefined}
                  aria-valuetext={shown || messages.empty}
                  aria-invalid={invalid || undefined}
                  required={required}
                  disabled={disabled}
                  placeholder="––"
                  value={shown}
                  onFocus={(event) => {
                    setPending(null)
                    event.currentTarget.select()
                  }}
                  onKeyDown={(event) => onSegmentKeyDown(segment, index, event)}
                  // A phone's keyboard sends no usable key to keydown, so its
                  // typing arrives here: the last character is the one typed.
                  onChange={(event) => {
                    const typed = event.target.value.slice(-1)
                    if (typed) typeKey(segment, index, typed)
                  }}
                  style={{ width: `${segment === 'dayPeriod' ? periodWidth : 2.25}ch` }}
                  className={segmentClasses}
                />
                {layout.literals[index + 1] ? (
                  <span aria-hidden className="self-center whitespace-pre text-ink-muted">
                    {layout.literals[index + 1]}
                  </span>
                ) : null}
              </React.Fragment>
            )
          })}
        </span>
        <span aria-hidden data-part="icon" className="ms-auto flex shrink-0 items-center text-ink-muted">
          <Clock />
        </span>
      </div>
      {error ? <DateError id={errorId}>{error}</DateError> : null}
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
    </div>
  )
}
