import { describe, expect, it } from 'vitest'

import { useScrollEdge } from './scroll-edge'

// jsdom has no layout, so the three measurements are set by hand.
function region({ scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }) {
  const el = document.createElement('div')
  let left = 0
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth })
  Object.defineProperty(el, 'clientWidth', { value: clientWidth })
  Object.defineProperty(el, 'scrollLeft', { get: () => left, set: (v: number) => (left = v) })
  const scrollTo = (v: number) => {
    left = v
    el.dispatchEvent(new Event('scroll'))
  }
  return { el, scrollTo }
}

describe('useScrollEdge', () => {
  it('marks a region that fits, without the cue', () => {
    const { el } = region({ scrollWidth: 300, clientWidth: 300 })
    const cleanup = useScrollEdge()(el)
    expect(el.hasAttribute('data-scroll-edge')).toBe(true)
    expect(el.hasAttribute('data-overflow-end')).toBe(false)
    cleanup?.()
  })

  it('shows the cue until the trailing edge is reached', () => {
    const { el, scrollTo } = region({ scrollWidth: 800, clientWidth: 300 })
    const cleanup = useScrollEdge()(el)
    expect(el.hasAttribute('data-overflow-end')).toBe(true)
    scrollTo(250)
    expect(el.hasAttribute('data-overflow-end')).toBe(true)
    scrollTo(500)
    expect(el.hasAttribute('data-overflow-end')).toBe(false)
    scrollTo(0)
    expect(el.hasAttribute('data-overflow-end')).toBe(true)
    cleanup?.()
  })

  it('follows a right-to-left scroll, where scrollLeft runs negative', () => {
    const { el, scrollTo } = region({ scrollWidth: 800, clientWidth: 300 })
    const cleanup = useScrollEdge()(el)
    scrollTo(-500)
    expect(el.hasAttribute('data-overflow-end')).toBe(false)
    scrollTo(-100)
    expect(el.hasAttribute('data-overflow-end')).toBe(true)
    cleanup?.()
  })

  // A code block at a max height keeps its frame and its <pre> when spacious
  // grows the type, so only its scrollWidth changes and no observer fires.
  it('re-measures when density changes, though no box resized', async () => {
    const el = document.createElement('div')
    let scrollWidth = 300
    Object.defineProperty(el, 'scrollWidth', { get: () => scrollWidth })
    Object.defineProperty(el, 'clientWidth', { value: 300 })
    Object.defineProperty(el, 'scrollLeft', { value: 0 })
    document.body.append(el)
    const cleanup = useScrollEdge()(el)
    expect(el.hasAttribute('data-overflow-end')).toBe(false)
    scrollWidth = 327
    document.documentElement.dataset.density = 'spacious'
    await Promise.resolve()
    expect(el.hasAttribute('data-overflow-end')).toBe(true)
    cleanup?.()
    delete document.documentElement.dataset.density
    el.remove()
  })

  it('stops listening when the element goes', () => {
    const { el, scrollTo } = region({ scrollWidth: 800, clientWidth: 300 })
    useScrollEdge()(el)?.()
    scrollTo(500)
    expect(el.hasAttribute('data-overflow-end')).toBe(true)
  })
})
