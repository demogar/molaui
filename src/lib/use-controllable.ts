'use client'

import * as React from 'react'

/**
 * One controlled-or-uncontrolled value: `value` / `defaultValue` /
 * `onChange`, the pair every prop like `open`, `sort`, `selection` or
 * `decision` follows.
 *
 * Nine components used to write this by hand, and the copies had drifted:
 * AlertDialog told the consumer about a change even when it was controlled
 * and nothing changed, NumberInput kept a shadow copy of Base UI's own state,
 * and DataTable had a private hook that the others could not see. One hook
 * gives one contract, tested once:
 *
 * - **Controlled** when `value !== undefined`. `null` is a value ("nothing
 *   picked"), so a controlled empty date picker stays controlled.
 * - **Uncontrolled** otherwise: the hook owns the value, seeded once from
 *   `defaultValue` (a function is called on mount, so a `new Set()` is not
 *   rebuilt on every render).
 * - `set(next)` updates the owned value when uncontrolled and calls
 *   `onChange` in both modes, but only when `next` differs from the current
 *   value (`Object.is`). A consumer is told about changes, not about every
 *   press that asked for the value it already has.
 *
 * src/test/controllable.test.ts fails a component that seeds its own state
 * from a `default*` prop instead of calling this.
 */
export function useControllable<T>({
  value,
  defaultValue,
  onChange,
}: {
  value: T | undefined
  defaultValue: T | (() => T)
  onChange?: ((next: T) => void) | undefined
}): readonly [T, (next: T) => void] {
  const [own, setOwn] = React.useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : own

  // Read through refs so the setter is stable and still sees the latest
  // value and handler: a component may hand it to an effect or a memoised
  // child, and a stale `current` would let a second change slip through as
  // "unchanged".
  const latest = React.useRef({ current, controlled, onChange })
  React.useLayoutEffect(() => {
    latest.current = { current, controlled, onChange }
  })

  const set = React.useCallback((next: T) => {
    const { current: prev, controlled: isControlled, onChange: notify } = latest.current
    if (Object.is(prev, next)) return
    if (!isControlled) {
      // Track it at once, so two calls in one event compare against the
      // newest value rather than the one from the last render. Not when
      // controlled: a parent that refuses the change never re-renders, and
      // a value tracked here would then swallow the next attempt.
      latest.current = { ...latest.current, current: next }
      setOwn(() => next)
    }
    notify?.(next)
  }, [])

  return [current, set] as const
}
