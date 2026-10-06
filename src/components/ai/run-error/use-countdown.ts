'use client'

import * as React from 'react'

/**
 * Milliseconds left until `until`, ticking while there is time left and
 * stopping at zero. `undefined` without a target.
 *
 * Ticks four times a second rather than once: a 1 s interval started at an
 * arbitrary moment shows each second up to a second late, so "0s" and the
 * retry it promises would visibly disagree.
 */
export function useCountdown(until: number | Date | undefined, { intervalMs = 250 }: { intervalMs?: number } = {}) {
  const target = until === undefined ? undefined : +until
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    if (target === undefined) return
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= target) clearInterval(id)
    }, intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [target, intervalMs])

  if (target === undefined) return undefined
  return Math.max(0, target - now)
}

/**
 * `24s`, `1m 05s`. Whole seconds, rounded up, because a countdown that says
 * "0s" while there is still half a second to wait is a promise broken in
 * front of the reader. Zero-padded past a minute so it ticks in place.
 */
export function formatCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

/** The same figure, spelled out for a screen reader: "1 minute 5 seconds". */
export function spokenCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000)
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (s < 60) return unit(s, 'second')
  const rest = s % 60
  return rest === 0 ? unit(Math.floor(s / 60), 'minute') : `${unit(Math.floor(s / 60), 'minute')} ${unit(rest, 'second')}`
}
