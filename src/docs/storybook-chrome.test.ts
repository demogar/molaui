import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHROME_PALETTES, molaDarkTheme, molaTheme } from '../../.storybook/mola-theme'
import { toHex } from '../tokens/color'
import { parseRootDeclarations, token, type ThemeName } from '../tokens/resolve'

/**
 * Storybook's chrome is written in literals (its manager cannot read
 * tokens.css), so this resolves every literal against the token it names, in
 * its theme: a token that changes without the chrome fails here instead of
 * leaving the sidebar a shade off the page it frames.
 */
const decls = parseRootDeclarations(readFileSync(resolve(import.meta.dirname, '../styles/tokens.css'), 'utf8'))

describe('Storybook chrome', () => {
  for (const theme of Object.keys(CHROME_PALETTES) as ThemeName[]) {
    it.each(Object.entries(CHROME_PALETTES[theme]))(`${theme}: %s is %s`, (name, hex) => {
      expect(toHex(token(name, theme, decls))).toBe(hex)
    })
  }

  // ADR 0002: red means danger. Selection, links and focus are ink.
  it.each([
    ['light', molaTheme],
    ['dark', molaDarkTheme],
  ] as const)('%s selects in ink, never rojo', (theme, chrome) => {
    const ink = CHROME_PALETTES[theme]['--ink']
    const rojo = toHex(token('--rojo', theme, decls))
    for (const key of ['colorPrimary', 'colorSecondary', 'barSelectedColor', 'barHoverColor'] as const) {
      expect(chrome[key], key).toBe(ink)
      expect(chrome[key], key).not.toBe(rojo)
    }
  })
})
