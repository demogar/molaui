import { describe, expect, it } from 'vitest'

import { type Box, GUTTER, leader, overlap, PIN, placePin, RING } from './anatomy-place'

/**
 * Pin placement without a browser. The browser audit (scripts/anatomy-scan.mjs)
 * checks the real diagrams; these hold the rules on boxes laid out by hand,
 * shaped like the Banner diagram that broke: a full-bleed strip with one short
 * row of parts, inside the diagram's gutter.
 */

const box = (left: number, top: number, width: number, height: number): Box => ({ left, top, width, height })
const ringed = (b: Box) => box(b.left - RING, b.top - RING, b.width + 2 * RING, b.height + 2 * RING)

// A 992 × 120 diagram; the strip fills it but for the gutter.
const bounds = { width: 992, height: 40 + 2 * GUTTER }
const strip = box(GUTTER, GUTTER, bounds.width - 2 * GUTTER, 40)
const icon = box(GUTTER + 16, GUTTER + 12, 16, 16)
const message = box(GUTTER + 44, GUTTER + 10, 560, 20)
const title = box(GUTTER + 44, GUTTER + 10, 100, 20)
const action = box(GUTTER + 760, GUTTER + 6, 120, 28)
const dismiss = box(GUTTER + 896, GUTTER + 8, 24, 24)
const ink = [icon, title, box(GUTTER + 150, GUTTER + 10, 454, 20), action, dismiss]

function placeAll(parts: Box[], rtl = false) {
  const pins: Box[] = []
  for (const part of parts) {
    const others = parts.filter((p) => p !== part && p !== strip)
    pins.push(placePin(part, { ink, parts: others, pins, around: part === strip ? [] : [strip] }, bounds, rtl))
  }
  return pins
}

describe('anatomy pin placement', () => {
  for (const rtl of [false, true]) {
    describe(rtl ? 'right to left' : 'left to right', () => {
      const parts = [strip, icon, message, title, action, dismiss]
      const pins = placeAll(parts, rtl)

      it('never overlaps two pins, rings included', () => {
        for (let i = 0; i < pins.length; i++)
          for (let j = i + 1; j < pins.length; j++) expect(overlap(ringed(pins[i]!), ringed(pins[j]!)), `pins ${i + 1} and ${j + 1}`).toBe(0)
      })

      it('keeps every pin and its ring inside the diagram', () => {
        for (const p of pins.map(ringed)) {
          expect(p.left).toBeGreaterThanOrEqual(0)
          expect(p.top).toBeGreaterThanOrEqual(0)
          expect(p.left + p.width).toBeLessThanOrEqual(bounds.width)
          expect(p.top + p.height).toBeLessThanOrEqual(bounds.height)
        }
      })

      it('covers no text or icon, ring included, when there is room elsewhere', () => {
        for (const p of pins) expect(ink.reduce((sum, b) => sum + overlap(ringed(p), b), 0)).toBe(0)
      })
    })
  }

  it('steps outward when every spot near the corner is taken', () => {
    // Pins already sitting on every preferred spot around the title.
    const crowd = [box(GUTTER + 22, GUTTER - 17, PIN, PIN), box(GUTTER + 44, GUTTER - 14, PIN, PIN), box(GUTTER + 70, GUTTER - 14, PIN, PIN)]
    const pin = placePin(title, { ink, parts: [], pins: crowd }, bounds, false)
    for (const other of crowd) expect(overlap(ringed(pin), ringed(other))).toBe(0)
  })

  it('draws a leader only from a pin that moved away from its part', () => {
    expect(leader(box(title.left - PIN + 5, title.top - PIN + 5, PIN, PIN), title, false)).toBeNull()
    const far = leader(box(title.left + 200, 4, PIN, PIN), title, false)
    expect(far).toMatchObject({ x2: title.left, y2: title.top })
  })
})
