/**
 * The colour arithmetic the contrast contract is checked with.
 *
 * Two operations, and both have to be exactly what the browser does or the
 * ratios quoted in `tokens.css` are fiction:
 *
 *   - WCAG 2.x relative luminance and contrast ratio, from sRGB.
 *   - `color-mix(in oklab, a p%, b)`, because every wash and every muted ink in
 *     this system is a mix, and a mix in OKLab is not the average of two hex
 *     values. Estimating a mix from its endpoints is how a 4.2:1 gets written
 *     down as 4.6:1.
 *
 * Pure functions, no DOM, so the same code runs in the unit test that guards
 * the palette and in the Storybook page that displays it.
 */

export type RGB = readonly [number, number, number]

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as unknown as RGB
}

export function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

const toLinear = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const fromLinear = (l: number) => {
  const s = l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, s * 255))
}

export function luminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

type Lab = [number, number, number]

function rgbToOklab([r, g, b]: RGB): Lab {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToRgb([L, A, B]: Lab): RGB {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/**
 * `color-mix(in oklab, a pct%, b)` for opaque colours.
 *
 * Mixing toward `transparent` is not this function's job: the result of that
 * depends on whatever is painted underneath, so callers resolve it with
 * `over()` against the ground it actually lands on.
 */
export function mixOklab(a: RGB, pct: number, b: RGB): RGB {
  const p = pct / 100
  const la = rgbToOklab(a)
  const lb = rgbToOklab(b)
  return oklabToRgb([0, 1, 2].map((i) => la[i]! * p + lb[i]! * (1 - p)) as Lab)
}

/** A colour at `alpha` composited over an opaque ground, in sRGB as browsers paint it. */
export function over(fg: RGB, alpha: number, ground: RGB): RGB {
  return [0, 1, 2].map((i) => fg[i]! * alpha + ground[i]! * (1 - alpha)) as unknown as RGB
}
