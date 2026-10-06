/**
 * STORY-ONLY. Simulated model output, so every AI component can be shown
 * moving in Storybook without a model behind it. Not exported from the
 * library: a consumer's stream comes from their transport, not from here.
 */
import * as React from 'react'

import type { StreamStatus } from '../streaming-text'

/** Split into token-sized pieces: words with their trailing space, roughly. */
export function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? []
}

export interface SimulatedStream {
  text: string
  status: StreamStatus
  start: () => void
  stop: () => void
  reset: () => void
}

/**
 * Streams `full` a token at a time. Irregular cadence on purpose — real
 * models burst and stall, and a UI only tested against a metronome hides the
 * jank a stall-then-burst produces.
 */
export function useSimulatedStream(
  full: string,
  { intervalMs = 45, autoStart = false }: { intervalMs?: number; autoStart?: boolean } = {},
): SimulatedStream {
  const tokens = React.useMemo(() => tokenize(full), [full])
  const [count, setCount] = React.useState(0)
  const [status, setStatus] = React.useState<StreamStatus>(autoStart ? 'streaming' : 'idle')

  React.useEffect(() => {
    if (status !== 'streaming') return
    if (count >= tokens.length) {
      const id = setTimeout(() => setStatus('done'), 0)
      return () => clearTimeout(id)
    }
    const stall = count > 0 && count % 17 === 0 ? 420 : 0
    const id = setTimeout(() => setCount((c) => Math.min(tokens.length, c + 1 + (c % 3 === 0 ? 1 : 0))), intervalMs + stall)
    return () => clearTimeout(id)
  }, [status, count, tokens.length, intervalMs])

  return {
    text: tokens.slice(0, count).join(''),
    status,
    start: () => {
      setCount(0)
      setStatus('streaming')
    },
    stop: () => setStatus((s) => (s === 'streaming' ? 'error' : s)),
    reset: () => {
      setCount(0)
      setStatus('idle')
    },
  }
}

/** A clock that advances while `running`, for scripted runs. */
export function useStoryClock(running: boolean, tickMs = 100) {
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    if (!running) return
    const id = setInterval(() => setT((v) => v + tickMs), tickMs)
    return () => clearInterval(id)
  }, [running, tickMs])
  return { t, reset: () => setT(0) }
}
