import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { contrast } from './color'
import { parseRootDeclarations, token, type ThemeName } from './resolve'

/**
 * The contrast contract.
 *
 * Every pairing the system promises is listed here with the ratio it owes, and
 * checked in both themes against tokens.css as written — including every
 * `color-mix()`, resolved in OKLab the way the browser resolves it. Changing a
 * hex value that silently drops a pairing below its bar fails this test, which
 * is the only reason the ratios quoted in tokens.css can be trusted.
 *
 * 4.5 is text (WCAG 1.4.3). 3 is a UI boundary or graphic mark (1.4.11).
 */

const css = readFileSync(resolve(import.meta.dirname, '../styles/tokens.css'), 'utf8')
const decls = parseRootDeclarations(css)
const THEMES: ThemeName[] = ['light', 'dark']

type Pair = [fg: string, bg: string, min: number, themes?: ThemeName[]]

const grounds = ['--cloth', '--cloth-pale', '--cloth-shade']
const inks = ['--ink', '--ink-2', '--ink-muted']
const washes = ['--rojo-soft', '--anil-soft', '--verde-soft', '--oro-soft', '--ink-soft']

const PAIRS: Pair[] = [
  // The ink ramp on every cloth ground.
  ...grounds.flatMap((g) => inks.map((i): Pair => [i, g, 4.5])),
  // The ink ramp on every wash.
  ...washes.flatMap((w) => inks.map((i): Pair => [i, w, 4.5])),
  // Layer and status colours as text on the page and on raised cloth.
  ...['--cloth', '--cloth-pale'].flatMap((g) =>
    ['--rojo', '--rojo-deep', '--anil', '--verde', '--warn', '--danger', '--success', '--info'].map(
      (c): Pair => [c, g, 4.5],
    ),
  ),
  // Gold carries text only in the dark theme; on light cloth it is a field.
  ['--oro', '--cloth', 4.5, ['dark']],
  ['--oro', '--cloth', 1, ['light']],
  // Ink on filled layers.
  ['--on-layer', '--rojo', 4.5],
  ['--on-layer', '--rojo-deep', 4.5],
  ['--on-layer', '--anil', 4.5],
  ['--on-layer', '--verde', 4.5],
  ['--on-oro', '--oro', 4.5],
  // The inverse panel.
  ['--on-ink', '--ink', 4.5],
  ['--on-ink-muted', '--ink', 4.5],
  ['--oro', '--ink', 4.5, ['light']],
  ['--on-ink-accent', '--ink', 4.5],
  // A tinted label.
  ['--rojo-on-shade', '--cloth-shade', 4.5],
  // The keyline bounds every control: a UI boundary owes 3:1.
  ...grounds.map((g): Pair => ['--ink', g, 3]),
]

describe('contrast contract', () => {
  for (const theme of THEMES) {
    describe(theme, () => {
      const cases = PAIRS.filter(([, , , only]) => !only || only.includes(theme))
      it.each(cases)('%s on %s ≥ %s', (fg, bg, min) => {
        const ratio = contrast(token(fg, theme, decls), token(bg, theme, decls))
        expect(ratio, `${fg} on ${bg} (${theme}) = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min)
      })
    })
  }

  it('keeps --keyline decorative: under 3:1, so it can never be mistaken for a control edge', () => {
    for (const theme of THEMES) {
      expect(contrast(token('--keyline', theme, decls), token('--cloth', theme, decls))).toBeLessThan(3)
    }
  })
})

describe('hex literals', () => {
  /**
   * tokens.css is the only file allowed a hex literal. A hex anywhere else is
   * a colour that does not change with the theme and was never measured —
   * which is how a "temporary" grey ends up in production for three years.
   */
  const root = resolve(import.meta.dirname, '..')
  const allowed = new Set(['styles/tokens.css'])

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return name === 'tokens' ? [] : walk(path)
      return /\.(css|tsx?|mdx)$/.test(name) ? [path] : []
    })
  }

  it('appear nowhere in src except tokens.css', () => {
    const offenders = walk(root)
      .map((path) => relative(root, path))
      .filter((rel) => !allowed.has(rel))
      .filter((rel) => /(?<![&\w])#[0-9a-f]{6}\b|(?<![&\w])#[0-9a-f]{3}\b(?![0-9a-f-])/i.test(
        readFileSync(join(root, rel), 'utf8')
          // A fenced block in a docs page QUOTES tokens.css; it defines nothing.
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, ''),
      ))
    expect(offenders).toEqual([])
  })
})
