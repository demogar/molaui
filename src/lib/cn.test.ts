import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { COLORS, cn } from './cn'

const theme = readFileSync(resolve(import.meta.dirname, '../styles/theme.css'), 'utf8')
const themeColors = [...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1])

describe('cn', () => {
  it('knows every colour token theme.css declares', () => {
    expect([...COLORS].sort()).toEqual([...themeColors].sort())
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

  it('treats the four voices as one font-family group', () => {
    expect(cn('font-ui', 'font-mono')).toBe('font-mono')
  })
})
