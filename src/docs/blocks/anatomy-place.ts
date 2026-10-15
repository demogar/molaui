/**
 * Where the Anatomy diagram's pins go (src/docs/blocks/anatomy.tsx). Pure
 * geometry, apart from the DOM, so it can be tested without a layout engine.
 */

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** The pin square (PinMark is `size-[22px]`). */
export const PIN = 22
/** How far a pin overlaps the corner it marks. */
export const TUCK = 5
/**
 * What a pin paints outside its square: `cut-band` draws a 1.5px keyline, the
 * 2px gold reveal and another 1.5px keyline, all box-shadow.
 */
export const RING = 5
/**
 * The room the diagram keeps around its example, in pixels. The docs frame's
 * own padding (24px) is less than a pin and its ring (32px), so a pin
 * clamped into it still sat on a full-bleed component's edge. 40 holds a pin
 * clear of the component, with a few pixels either side.
 */
export const GUTTER = 40
/** The gap between two pin squares: both rings, and a pixel between them. */
const CLEAR = 2 * RING + 1
/** The grid the outward search walks, in pixels. */
const GRID = 4
/** Square windows around the corner the search tries before the whole diagram. */
const REACH = [2 * PIN, 4 * PIN, 8 * PIN]

export function overlap(a: Box, b: Box) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

const grow = (b: Box, by: number): Box => ({ left: b.left - by, top: b.top - by, width: b.width + 2 * by, height: b.height + 2 * by })

/** Distance from a point to the nearest edge of a box (0 inside it). */
export function distance(b: Box, x: number, y: number) {
  const dx = Math.max(b.left - x, 0, x - (b.left + b.width))
  const dy = Math.max(b.top - y, 0, y - (b.top + b.height))
  return Math.hypot(dx, dy)
}

/** The corner a pin names: the part's top corner on the side reading starts. */
export const corner = (r: Box, rtl: boolean) => ({ x: rtl ? r.left + r.width : r.left, y: r.top })

export interface Avoid {
  /** What a reader came to see: lines of text, icons, controls. */
  ink: Box[]
  /** The other parts (not this part's ancestors: every pin sits inside the root). */
  parts: Box[]
  /** Pins already placed. */
  pins: Box[]
  /**
   * The parts this one sits inside (the root, a row). Every pin is inside the
   * root, so they weigh little, but enough that a pin with a choice sits in
   * the gutter rather than on a banner's strip.
   */
  around?: Box[]
}

/**
 * Where a pin goes. A pin covers something wherever it sits, so the question
 * is what it covers. Centred on the part's corner, it covered the first
 * letters of every label it named; always outside the corner, it covered the
 * icon or the line before. Text is measured per line, so a pin may sit in the
 * white space beside a short label but not on it.
 *
 * The first version tried six fixed spots around the part's leading top
 * corner and took the one that covered least, with other pins only weighted
 * (×20), not forbidden, and every spot clamped into the diagram. A full-bleed
 * strip with one short row of parts (Banner) left all six spots on the strip
 * or on the clamped top edge, so pins stacked on each other and on the
 * message. Two rules replace the weighting:
 *
 *   - a pin never overlaps another pin, ring included. A spot that would is
 *     not a candidate at all;
 *   - when no spot near the corner is clear of text, the search steps
 *     outward, in wider squares up to the whole diagram, and the diagram
 *     keeps a gutter around the example (GUTTER) so there is somewhere to go.
 *     A pin that ends up away from its part gets a leader line.
 *
 * A spot costs what it covers (text and icons most, then the other parts,
 * then its own part) plus how far it is from the corner, so the nearest spot
 * clear of text wins, and a pin covers text only when nothing else is left.
 */
export function placePin(r: Box, avoid: Avoid, bounds: { width: number; height: number }, rtl: boolean): Box {
  const { x: lead, y: top } = corner(r, rtl)
  // Offsets along the reading direction, from the leading edge.
  const at = (dx: number) => (rtl ? lead - dx - PIN : lead + dx)
  const step = PIN + 4
  const above = top - PIN - 2
  const below = top + r.height + 2
  // The spots that read best, tried before the grid: diagonally outside,
  // beside, above, just inside.
  const preferred = [
    { x: at(TUCK - PIN), y: top - PIN + TUCK },
    { x: at(-PIN - 2), y: top },
    { x: at(0), y: above },
    { x: at(step), y: above },
    { x: at(2), y: top + 2 },
    { x: at(2 * step), y: above },
    // Below only a short part: under a tall one the pin is nowhere near the corner it names.
    ...(r.height <= 2 * PIN ? [{ x: at(0), y: below }, { x: at(step), y: below }] : []),
  ]
  // The ring draws outside the square, so keep it clear of the clipped edge.
  const maxX = bounds.width - PIN - RING
  const maxY = bounds.height - PIN - RING
  const square = (x: number, y: number): Box => ({
    left: Math.min(Math.max(x, RING), maxX),
    top: Math.min(Math.max(y, RING), maxY),
    width: PIN,
    height: PIN,
  })
  const taken = avoid.pins.map((p) => grow(p, CLEAR))
  const around = avoid.around ?? []

  const found: { best?: { box: Box; ink: number; cost: number } } = {}
  const consider = (c: Box, ink: Box[], parts: Box[]) => {
    if (taken.some((p) => overlap(c, p))) return
    // With its ring: a ring over the first letter hides it as well as the square would.
    const painted = grow(c, RING)
    let covered = 0
    for (const b of ink) covered += overlap(painted, b)
    let others = 0
    for (const b of parts) others += overlap(c, b)
    let inside = 0
    for (const b of around) inside += overlap(c, b)
    const cost = covered * 100 + others / 4 + inside / 8 + overlap(c, r) / 2 + distance(c, lead, top) * 3
    if (!found.best || cost < found.best.cost) found.best = { box: c, ink: covered, cost }
  }
  for (const { x, y } of preferred) consider(square(x, y), avoid.ink, avoid.parts)
  if (found.best?.ink === 0) return found.best.box

  // Step outward from the corner until a spot clear of text turns up.
  const x = rtl ? lead - PIN : lead
  for (const reach of [...REACH, Math.max(bounds.width, bounds.height)]) {
    const window = { left: x - reach, top: top - reach, width: 2 * reach + PIN, height: 2 * reach + PIN }
    // Only what the window can touch is worth measuring against.
    const ink = avoid.ink.filter((b) => overlap(grow(window, RING), b))
    const parts = avoid.parts.filter((b) => overlap(window, b))
    const x1 = Math.min(maxX, window.left + window.width - PIN)
    const y1 = Math.min(maxY, window.top + window.height - PIN)
    for (let cy = Math.max(RING, window.top); cy <= y1; cy += GRID)
      for (let cx = Math.max(RING, window.left); cx <= x1; cx += GRID) consider({ left: cx, top: cy, width: PIN, height: PIN }, ink, parts)
    if (found.best?.ink === 0) break
  }
  // Nowhere clear of the other pins at all: a diagram too small for its
  // parts. The browser audit's anatomy scan reports the collision.
  return found.best?.box ?? square(at(TUCK - PIN), top - PIN + TUCK)
}

/**
 * The leader from a pin that had to move away from its part: from the pin's
 * edge nearest the corner to the corner. None when the pin touches the part.
 */
export function leader(pin: Box, r: Box, rtl: boolean) {
  if (distance(grow(r, 2), pin.left + PIN / 2, pin.top + PIN / 2) <= PIN / 2 + 2) return null
  const { x, y } = corner(r, rtl)
  const from = {
    x: Math.min(Math.max(x, pin.left), pin.left + pin.width),
    y: Math.min(Math.max(y, pin.top), pin.top + pin.height),
  }
  return { x1: from.x, y1: from.y, x2: x, y2: y }
}
