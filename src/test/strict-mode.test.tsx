import { useEffect } from 'react'
import { expect, it } from 'vitest'

import { render, renderHook } from '@/test/render'

/**
 * Proves src/test/render.tsx really turns strict mode on: React mounts,
 * unmounts and remounts once in strict mode, so a mount effect runs twice.
 * If the `configure` call is removed, both counts drop to one.
 */
it('renders components and hooks in React strict mode', () => {
  let mounts = 0
  function Probe() {
    useEffect(() => {
      mounts++
    }, [])
    return null
  }
  render(<Probe />)
  expect(mounts).toBe(2)

  let hookMounts = 0
  renderHook(() =>
    useEffect(() => {
      hookMounts++
    }, []),
  )
  expect(hookMounts).toBe(2)
})
