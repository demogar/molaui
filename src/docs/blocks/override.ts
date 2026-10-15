import { contrast } from '../../tokens/color'
import { promisedPairs } from '../../tokens/pairings'
import { parseRootDeclarations, resolveColor, type ThemeName } from '../../tokens/resolve'

/**
 * The contrast contract, run on an app's own override instead of on
 * tokens.css as shipped.
 *
 * The contract test measures the file in this repository. The moment an app
 * writes `--accent: …` on its own `:root`, that measurement says nothing about
 * what the app paints, and nothing in the app's build will notice. So
 * Foundations/Theming shows its worked example through this: the override is
 * laid over tokens.css, every promised pairing that can see a changed token
 * (directly or through a `var()` chain, so `--selected` is re-measured when
 * `--accent-soft` changes) is measured again in both themes, and the page
 * shows the result. foundations.test.tsx holds the worked example to passing
 * and the "don't" example to failing, so the page's claims are measured too.
 *
 * No React here: scripts/agent-docs.ts renders the same table into the
 * Markdown twin, and it cannot import a `?raw` stylesheet.
 */

export interface OverrideRow {
  fg: string
  bg: string
  min: number
  theme: ThemeName
  /** The ratio with the override applied. */
  ratio: number
  /** The ratio tokens.css gives the same pairing. */
  shipped: number
  holds: boolean
}

export interface OverrideResult {
  /** The tokens the override declares. */
  changed: string[]
  /** Every token whose value moves with them, the changed ones included. */
  affected: string[]
  rows: OverrideRow[]
  failing: OverrideRow[]
}

/** The tokens `name` reads, through every `var()` in its value. */
function reads(name: string, decls: Map<string, string>, seen = new Set<string>()): Set<string> {
  if (seen.has(name)) return seen
  seen.add(name)
  for (const m of (decls.get(name) ?? '').matchAll(/var\((--[a-z0-9-]+)/g)) reads(m[1]!, decls, seen)
  return seen
}

/**
 * Lay `css` (a `:root, [data-theme] { … }` rule, as an app would write it)
 * over `base` and re-measure every promised pairing it can reach.
 */
export function checkOverride(css: string, base: Map<string, string>): OverrideResult {
  const override = parseRootDeclarations(css)
  const unknown = [...override.keys()].filter((name) => !base.has(name))
  if (unknown.length) throw new Error(`Not a Mola token: ${unknown.join(', ')}`)
  const merged = new Map([...base, ...override])
  const changed = [...override.keys()]
  const affected = [...merged.keys()].filter((name) => changed.some((c) => reads(name, merged).has(c)))
  const rows: OverrideRow[] = []
  for (const [fg, bg, min, themes] of promisedPairs()) {
    if (!affected.includes(fg) && !affected.includes(bg)) continue
    for (const theme of themes ?? (['light', 'dark'] as const)) {
      const measure = (decls: Map<string, string>) => {
        const a = resolveColor(decls.get(fg)!, theme, decls)
        const b = resolveColor(decls.get(bg)!, theme, decls)
        if (!a || !b) throw new Error(`${fg} on ${bg} does not resolve to opaque colours in ${theme}`)
        return contrast(a, b)
      }
      const ratio = measure(merged)
      rows.push({ fg, bg, min, theme, ratio, shipped: measure(base), holds: ratio >= min })
    }
  }
  return { changed, affected, rows, failing: rows.filter((r) => !r.holds) }
}

/** The text of a fenced code block as MDX hands it to a component: nested elements down to one string. */
export function textOf(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: unknown } }).props.children)
  return ''
}
