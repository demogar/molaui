import { act, render, screen } from '@/test/render'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatRelativeTime, msUntilChange, RelativeTime } from './relative-time'

const NOW = Date.parse('2026-10-14T09:12:00Z')
const s = 1_000
const m = 60 * s
const h = 60 * m
const d = 24 * h

afterEach(() => {
  vi.useRealTimers()
})

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('formatRelativeTime', () => {
  it('picks the largest unit reached and truncates, so it never claims more time than has passed', () => {
    expect(formatRelativeTime(NOW - 42 * s, NOW, { locale: 'en-US' })).toBe('42 seconds ago')
    expect(formatRelativeTime(NOW - 59 * m - 59 * s, NOW, { locale: 'en-US' })).toBe('59 minutes ago')
    expect(formatRelativeTime(NOW - 3 * h, NOW, { locale: 'en-US' })).toBe('3 hours ago')
    expect(formatRelativeTime(NOW - 13 * d, NOW, { locale: 'en-US' })).toBe('last week')
    expect(formatRelativeTime(NOW - 400 * d, NOW, { locale: 'en-US' })).toBe('last year')
    expect(formatRelativeTime(NOW + 2 * d + h, NOW, { locale: 'en-US' })).toBe('in 2 days')
  })

  it('takes the words from Intl for the locale, format and numeric style', () => {
    expect(formatRelativeTime(NOW, NOW, { locale: 'en-US' })).toBe('now')
    expect(formatRelativeTime(NOW - d, NOW, { locale: 'en-US' })).toBe('yesterday')
    expect(formatRelativeTime(NOW - d, NOW, { locale: 'en-US', numeric: 'always' })).toBe('1 day ago')
    expect(formatRelativeTime(NOW - 3 * m, NOW, { locale: 'en-US', format: 'narrow' })).toBe('3m ago')
    expect(formatRelativeTime(NOW - 3 * m, NOW, { locale: 'es-PA' })).toBe('hace 3 minutos')
  })

  it('wakes when the text would next change, not on an interval', () => {
    expect(msUntilChange(NOW - 42.5 * s, NOW)).toBe(500)
    expect(msUntilChange(NOW - 3 * m - 10 * s, NOW)).toBe(50 * s)
    expect(msUntilChange(NOW + 90 * s, NOW)).toBe(30 * s)
    // Months and years are averages, so a long sleep is capped at an hour.
    expect(msUntilChange(NOW - 40 * d, NOW)).toBe(h)
  })
})

describe('RelativeTime', () => {
  it('is a <time> with the exact moment in dateTime and title, and does not tick when given now', () => {
    vi.useFakeTimers()
    render(<RelativeTime date={NOW - 3 * m} now={NOW} locale="en-GB" timeZone="UTC" />)
    const time = screen.getByText('3 minutes ago')
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2026-10-14T09:09:00.000Z')
    expect(time).toHaveAttribute('title', '14 Oct 2026, 09:09')
    act(() => vi.advanceTimersByTime(5 * m))
    expect(screen.getByText('3 minutes ago')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reads the browser clock after mount and keeps it current', () => {
    vi.useFakeTimers({ now: NOW })
    render(<RelativeTime date={NOW - 58 * s} locale="en-US" />)
    expect(screen.getByText('58 seconds ago')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2 * s))
    expect(screen.getByText('1 minute ago')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(m))
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument()
  })

  it('schedules nothing in a hidden tab, and re-reads the clock when shown', () => {
    vi.useFakeTimers({ now: NOW })
    try {
      render(<RelativeTime date={NOW - 10 * s} locale="en-US" />)
      act(() => setVisibility('hidden'))
      expect(vi.getTimerCount()).toBe(0)
      act(() => vi.advanceTimersByTime(5 * m))
      expect(screen.getByText('10 seconds ago')).toBeInTheDocument()
      act(() => setVisibility('visible'))
      expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
      expect(vi.getTimerCount()).toBe(1)
    } finally {
      setVisibility('visible')
    }
  })

  it('reads the clock once with live off', () => {
    vi.useFakeTimers({ now: NOW })
    render(<RelativeTime date={NOW - 10 * s} locale="en-US" live={false} />)
    act(() => vi.advanceTimersByTime(m))
    expect(screen.getByText('10 seconds ago')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('forwards ref, className and DOM props to the <time>', () => {
    const ref = vi.fn()
    render(<RelativeTime ref={ref} date={NOW} now={NOW} className="text-ink-muted" data-testid="t" />)
    const time = screen.getByTestId('t')
    expect(ref).toHaveBeenCalledWith(time)
    expect(time).toHaveClass('text-ink-muted', 'tabular')
  })
})
