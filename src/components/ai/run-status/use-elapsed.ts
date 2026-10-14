'use client'

import * as React from 'react'

import { useHydrated } from '../../../lib/use-hydrated'

/**
 * Milliseconds since `startedAt`, ticking while the work is still open.
 *
 * Latency is shown as a clock that keeps counting, never as a progress bar
 * with a number on it. A model call has no knowable total: a percentage would
 * be invented, and an invented percentage that stalls at 90% is the most
 * reliable way to teach an operator that the UI lies. Elapsed time is the one
 * honest number available, and it is also the one an operator needs to decide
 * whether to wait or cancel.
 *
 * Ticks every 100ms while open (one decimal place is the resolution shown
 * under a minute), and stops the moment `endedAt` arrives so a finished step
 * reads a fixed duration rather than drifting.
 *
 * An open clock is `undefined` on the server and while hydrating, and starts
 * on the first render after: the server's "now" is not the browser's, so any
 * figure rendered there would be wrong by the time it arrived and would make
 * React discard the server HTML. A closed one (`endedAt` known) needs no
 * clock and renders everywhere.
 */
export function useElapsed(
  startedAt: number | Date | undefined,
  endedAt?: number | Date | undefined,
  { intervalMs = 100 }: { intervalMs?: number } = {},
): number | undefined {
  const start = startedAt === undefined ? undefined : +startedAt
  const end = endedAt === undefined ? undefined : +endedAt
  const hydrated = useHydrated()
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    if (start === undefined || end !== undefined) return
    // Re-read the clock straight away (asynchronously, so a fresh start does
    // not render one stale frame), then on every interval.
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [start, end, intervalMs])

  if (start === undefined) return undefined
  if (end !== undefined) return Math.max(0, end - start)
  if (!hydrated) return undefined
  return Math.max(0, now - start)
}

/**
 * `0.4s`, `12.4s`, `4m 07s`, `1h 02m`. One decimal under a minute because
 * that is where tenths change a decision; whole units above it because nobody
 * cancels a 4-minute run over a tenth of a second. Seconds are zero-padded
 * past the first minute so a ticking clock never changes width — the figure
 * is set tabular, and a `4m 7s` → `4m 10s` jump would still shift the row.
 */
export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${(Math.floor(ms / 100) / 10).toFixed(1)}s`
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}m ${String(s).padStart(2, '0')}s`
  }
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
