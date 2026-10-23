import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { cn } from './cn'

const theme = readFileSync(resolve(import.meta.dirname, '../styles/theme.css'), 'utf8')
const themeColors = [...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1])

describe('cn', () => {
  it('reads the colour tokens', () => {
    expect(themeColors.length).toBeGreaterThan(30)
  })

  it.each(themeColors)('keeps text-%s beside a font size', (color) => {
    expect(cn('text-2xs', `text-${color}`)).toBe(`text-2xs text-${color}`)
  })

  it('lets a later size replace an earlier one', () => {
    expect(cn('text-2xs', 'text-sm')).toBe('text-sm')
  })

  it('treats the keyline and the elevation as one shadow group', () => {
    expect(cn('shadow-cut', 'shadow-raised')).toBe('shadow-raised')
  })

  it('treats the named columns as one max-width group', () => {
    expect(cn('max-w-reading', 'max-w-page')).toBe('max-w-page')
    expect(cn('max-w-page', 'max-w-none')).toBe('max-w-none')
  })

  it('treats the four voices as one font-family group', () => {
    expect(cn('font-ui', 'font-mono')).toBe('font-mono')
  })

  it('knows the line heights and tracking by job, and the overlay elevation', () => {
    expect(cn('leading-body', 'leading-heading')).toBe('leading-heading')
    expect(cn('tracking-label', 'tracking-figures')).toBe('tracking-figures')
    expect(cn('shadow-floating', 'shadow-overlay')).toBe('shadow-overlay')
  })
})

describe('Mola’s own utilities', () => {
  const cloth = readFileSync(resolve(import.meta.dirname, '../styles/cloth.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  /** Every @utility, a functional one (`cut-*`) tried with a colour. */
  const utilities = [...cloth.matchAll(/^@utility ([a-z0-9]+(?:-[a-z0-9]+)*(?:-\*)?)/gm)].map((m) => m[1]!.replace(/\*$/, 'ink'))

  /** The utilities that set something no other class sets, so there is nothing for them to replace. */
  const STANDS_ALONE: Record<string, string> = {
    'display-cut': 'a text-shadow; nothing else in the system sets one',
    'forced-focus': 'an outline under forced colours only',
    'scroll-cloth': 'the scrollbar colours; nothing else sets them',
    'scroll-edge': 'the trailing scroll cue, drawn only under data-overflow-end',
    'flip-rtl': 'a scale under :dir(rtl) only',
  }

  it('puts every @utility in cloth.css in a group, or says why it stands alone', () => {
    // A class the merger knows replaces a copy of itself; one it leaves alone
    // survives twice. cn('band-oro', 'band-rojo') used to keep both.
    expect(utilities.length).toBeGreaterThan(40)
    const orphans = utilities.filter((u) => !(u in STANDS_ALONE) && cn(u, u) !== u)
    expect(orphans).toEqual([])
    expect(Object.keys(STANDS_ALONE).filter((u) => !utilities.includes(u))).toEqual([])
  })

  it('lets a later band, panel, relleno, width or forced role replace an earlier one', () => {
    expect(cn('band-oro', 'band-danger')).toBe('band-danger')
    expect(cn('cut', 'cut-band')).toBe('cut-band')
    expect(cn('on-ink', 'on-layer')).toBe('on-layer')
    expect(cn('relleno', 'relleno-working')).toBe('relleno-working')
    expect(cn('forced-ink', 'forced-selected')).toBe('forced-selected')
    expect(cn('wdth-display', 'wdth-label')).toBe('wdth-label')
    expect(cn('rotulo', 'etiqueta')).toBe('etiqueta')
  })

  it('adds edges on different sides and replaces one on the same side', () => {
    expect(cn('cut-t', 'cut-b')).toBe('cut-t cut-b')
    expect(cn('bar-start-ink', 'rule-b-soft', 'focus-ring')).toBe('bar-start-ink rule-b-soft focus-ring')
    expect(cn('rule-b', 'cut-b')).toBe('cut-b')
    expect(cn('bar-start-ink', 'bar-start-danger')).toBe('bar-start-danger')
    expect(cn('cut-anil', 'cut-thin')).toBe('cut-thin')
  })

  it('lets an edge and a shadow replace each other, since each writes the whole box-shadow', () => {
    expect(cn('shadow-cut', 'rule-b')).toBe('rule-b')
    expect(cn('rule-b', 'shadow-none')).toBe('shadow-none')
  })
})
