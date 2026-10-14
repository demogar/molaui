import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { validateDtcg } from './dtcg'

const committed = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../tokens/mola.tokens.json'), 'utf8'))
const token = ($type: string, $value: unknown) => ({ g: { t: { $type, $value } } })

describe('the DTCG validator', () => {
  it('passes the committed token file', () => {
    expect(validateDtcg(committed)).toEqual([])
  })

  it('gives every density mode the same keys', () => {
    const keys = (mode: string) => Object.keys(committed.density[mode]).sort()
    expect(keys('compact')).toEqual(keys('comfortable'))
    expect(keys('spacious')).toEqual(keys('comfortable'))
  })

  it('keeps the translucent colours the first export dropped', () => {
    for (const name of ['scrim', 'backdrop', 'rojo-rule', 'keyline-on-ink', 'on-scrim-muted']) {
      expect(committed.color.light[name]?.$value.alpha).toBeLessThan(1)
      expect(committed.color.dark[name]?.$value.alpha).toBeLessThan(1)
    }
  })

  // Each shape the first export wrote, which an importer rejects or misreads.
  it.each([
    ['a number written as a string', token('number', '1.55')],
    ['a cubic Bézier written as a string', token('cubicBezier', '0.2, 0, 0, 1')],
    ['a whole font stack as one family', token('fontFamily', "'Archivo Variable', 'Archivo', system-ui")],
    ['a bare dimension string', token('dimension', '11px')],
    ['an em dimension', token('dimension', { value: 0.14, unit: 'em' })],
    ['a bare duration string', token('duration', '120ms')],
    ['a hex string colour', token('color', '#edeee8')],
    ['an srgb component out of range', token('color', { colorSpace: 'srgb', components: [255, 0, 0] })],
    ['a shadow with no spread', token('shadow', { color: { colorSpace: 'srgb', components: [0, 0, 0] }, offsetX: { value: 0, unit: 'px' }, offsetY: { value: 0, unit: 'px' }, blur: { value: 0, unit: 'px' } })],
    ['a type it does not know', token('animation', 'mola-in 220ms')],
    ['a token with no type', { g: { t: { $value: 1 } } }],
    ['an alias to nothing', token('number', '{g.missing}')],
    ['a name with a dot', { 'g.h': { $type: 'number', $value: 1 } }],
  ])('rejects %s', (_, doc) => {
    expect(validateDtcg(doc)).not.toEqual([])
  })

  it('accepts an alias to a token of the same type, with the type inherited from the group', () => {
    expect(validateDtcg({ size: { $type: 'dimension', a: { $value: { value: 1, unit: 'rem' } }, b: { $value: '{size.a}' } } })).toEqual([])
  })
})
