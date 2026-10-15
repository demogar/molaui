// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Forced colours (Windows High Contrast) removes box-shadows and gradient
 * background images and forces background colours, including `currentColor`,
 * to the system palette. Every cloth utility that draws with one of those is
 * invisible there unless it says what to draw instead. `relleno` dividers and
 * `diente` seams shipped without that and vanished; only `relleno-working`
 * had it. So every utility in cloth.css that draws this way must carry a
 * `@media (forced-colors: active)` block, or be listed below with the reason
 * it may disappear. The visual suite photographs the relleno and diente
 * stories in forced colours too (test/visual/stories.visual.ts).
 */
const EXEMPT: Record<string, string> = {
  'relleno-field': 'a faint texture under content; full-strength CanvasText stripes would compete with the words',
  'cut-band-focus': 'only ever added to a field that already has a cut, whose forced outline stays',
}

const css = readFileSync(resolve(import.meta.dirname, 'cloth.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function utilities(): { name: string; body: string }[] {
  return [...css.matchAll(/@utility ([\w-]+) \{/g)].map((m) => {
    let depth = 0
    let i = m.index + m[0].length - 1
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) break
    }
    return { name: m[1]!, body: css.slice(m.index + m[0].length, i) }
  })
}

const FORCED = /@media \(forced-colors: active\)/
const DRAWS = /box-shadow|background-image|background-color:\s*currentColor/

describe('forced colours', () => {
  it('reads the utilities', () => {
    expect(utilities().map((u) => u.name)).toEqual(expect.arrayContaining(['relleno', 'diente', 'diente-up', 'cut']))
  })

  it('gives every utility that draws with a shadow, a gradient or currentColor a forced-colours rule', () => {
    const missing = utilities()
      .filter(({ name, body }) => !(name in EXEMPT) && DRAWS.test(body.split(FORCED)[0]!) && !FORCED.test(body))
      .map((u) => u.name)
    expect(missing).toEqual([])
  })

  it('keeps every exemption current', () => {
    const names = utilities().map((u) => u.name)
    expect(Object.keys(EXEMPT).filter((name) => !names.includes(name))).toEqual([])
  })
})
