import { act, renderHook } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'

import { useControllable } from './use-controllable'

describe('useControllable', () => {
  it('owns the value when uncontrolled, seeded once from defaultValue', () => {
    const seed = vi.fn(() => 1)
    const onChange = vi.fn()
    const { result, rerender } = renderHook(() => useControllable<number>({ value: undefined, defaultValue: seed, onChange }))
    expect(result.current[0]).toBe(1)
    // Strict mode calls an initializer twice on mount; what matters is that
    // later renders never call it again.
    const seeded = seed.mock.calls.length
    act(() => result.current[1](2))
    expect(result.current[0]).toBe(2)
    expect(onChange).toHaveBeenCalledWith(2)
    rerender()
    expect(seed).toHaveBeenCalledTimes(seeded)
  })

  it('follows value when controlled and only reports the request', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<number>({ value: 5, defaultValue: 1, onChange }))
    act(() => result.current[1](6))
    expect(result.current[0]).toBe(5)
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('treats null as a controlled value, not as absent', () => {
    const { result } = renderHook(() => useControllable<number | null>({ value: null, defaultValue: 3 }))
    act(() => result.current[1](4))
    expect(result.current[0]).toBeNull()
  })

  it('does not report a change to the value it already has', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<boolean>({ value: false, defaultValue: false, onChange }))
    act(() => result.current[1](false))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lets a refused controlled change be asked for again', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<boolean>({ value: false, defaultValue: false, onChange }))
    act(() => result.current[1](true))
    act(() => result.current[1](true))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('compares two changes in one event against the newest value', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllable<number>({ value: undefined, defaultValue: 0, onChange }))
    act(() => {
      result.current[1](1)
      result.current[1](1)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('keeps the setter stable across renders', () => {
    const { result, rerender } = renderHook(() => useControllable<number>({ value: undefined, defaultValue: 0 }))
    const first = result.current[1]
    act(() => first(1))
    rerender()
    expect(result.current[1]).toBe(first)
  })
})
