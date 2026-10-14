import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { contrast, over, type RGB } from './color'
import { OVERLAID, PAIRS } from './pairings'
import { parseRootDeclarations, resolveLayer, token, type ThemeName } from './resolve'

/**
 * The contrast contract.
 *
 * Every pairing the system promises is listed in ./pairings.ts with the ratio
 * it owes (shared with the agent docs, so what is published is what is
 * measured), and checked here in both themes against tokens.css as written —
 * including every `color-mix()`, resolved in OKLab the way the browser
 * resolves it. Changing a
 * hex value that silently drops a pairing below its bar fails this test, which
 * is the only reason the ratios quoted in tokens.css can be trusted.
 *
 * 4.5 is text (WCAG 1.4.3). 3 is a UI boundary or graphic mark (1.4.11).
 */

const css = readFileSync(resolve(import.meta.dirname, '../styles/tokens.css'), 'utf8')
const decls = parseRootDeclarations(css)
const THEMES: ThemeName[] = ['light', 'dark']

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

  describe('over a translucent overlay', () => {
    const PIXELS = { white: [255, 255, 255], black: [0, 0, 0] } as const satisfies Record<string, RGB>
    const cases = OVERLAID.flatMap(({ fg, overlay, under, min }) =>
      THEMES.flatMap((theme) => under.map((u) => [fg, overlay, u, theme, min] as const)),
    )
    it.each(cases)('%s on %s over %s (%s) ≥ %s', (fg, overlay, under, theme, min) => {
      const beneath = under in PIXELS ? PIXELS[under as keyof typeof PIXELS] : token(under, theme, decls)
      const o = resolveLayer(overlay, theme, decls)
      const ground = over(o.rgb, o.alpha, beneath)
      const f = resolveLayer(fg, theme, decls)
      const ratio = contrast(over(f.rgb, f.alpha, ground), ground)
      expect(ratio, `${fg} on ${overlay} over ${under} (${theme}) = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min)
    })
  })

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

describe('nested themes', () => {
  /**
   * A token whose value depends on the theme must be redeclared on
   * [data-theme], or a build that lowers `light-dark()` (Lightning CSS does,
   * for browsers before Chrome 123 / Safari 17.5) freezes it to the root's
   * scheme and a nested `data-theme="dark"` subtree paints light. The browser
   * audit proves the result; this names the token that was left out.
   */
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const themed = /:root,\s*\[data-theme\]\s*\{([^}]*)\}/.exec(stripped)?.[1] ?? ''
  const themedNames = new Set([...themed.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!))

  const dependsOnTheme = (name: string, seen = new Set<string>()): boolean => {
    const value = decls.get(name) ?? ''
    if (value.includes('light-dark(')) return true
    if (seen.has(name)) return false
    seen.add(name)
    return [...value.matchAll(/var\((--[a-z0-9-]+)/g)].some((m) => dependsOnTheme(m[1]!, seen))
  }

  it('declares every theme-dependent token on :root and [data-theme]', () => {
    expect(themedNames.size).toBeGreaterThan(0)
    const missing = [...decls.keys()].filter((name) => dependsOnTheme(name) && !themedNames.has(name))
    expect(missing).toEqual([])
  })
})
