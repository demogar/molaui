import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RunStatus, isActiveStatus, isRetryableStatus } from './run-status'
import { formatDuration } from './use-elapsed'

describe('formatDuration', () => {
  it.each([
    [400, '0.4s'],
    [12_449, '12.4s'],
    [59_999, '59.9s'],
    [247_000, '4m 07s'],
    [3_720_000, '1h 02m'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})

describe('RunStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('always states the status in words, not just a colour', () => {
    render(<RunStatus status="failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('keeps counting while the work is open', () => {
    render(<RunStatus status="running" startedAt={Date.now()} />)
    expect(screen.getByText('0.0s')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2_500)
    })
    expect(screen.getByText('2.5s')).toBeInTheDocument()
  })

  it('freezes at the end time once finished', () => {
    const start = Date.now()
    render(<RunStatus status="succeeded" startedAt={start} endedAt={start + 4_200} />)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText('4.2s')).toBeInTheDocument()
  })

  it('shows no clock for a finished status with no end time', () => {
    render(<RunStatus status="cancelled" startedAt={Date.now()} />)
    expect(screen.queryByText(/\d\.\ds/)).not.toBeInTheDocument()
  })
})

describe('status predicates', () => {
  it('treats waiting for approval as open work', () => {
    expect(isActiveStatus('waiting')).toBe(true)
  })
  it('offers retry for failures and cancellations, not for success', () => {
    expect(isRetryableStatus('timed_out')).toBe(true)
    expect(isRetryableStatus('succeeded')).toBe(false)
  })
})
