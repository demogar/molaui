import { toHex } from './color'
import { resolveColor, type ThemeName } from './resolve'

/**
 * The token table's rows, kept apart from src/docs/blocks/tokens-source.ts
 * because that module imports tokens.css with Vite's `?raw`, which only a
 * Vite build understands. The Tokens page and scripts/export-manifest.ts (the
 * agent docs, run by Node) both read the rows through this function, so the
 * page and llms-tokens.txt cannot disagree.
 */
export interface TokenRow {
  name: string
  /** The section of tokens.css it is declared in, and its own comment if it has one. */
  group: string
  note: string | null
  raw: string
  /** Resolved per theme: a hex for a colour the resolver can flatten, else the declared value. */
  light: string
  dark: string
  /** True when the value is a colour the resolver flattened to a hex. */
  isColor: boolean
}

/**
 * Every custom property declared in a rule whose selector list includes :root
 * (the colour tokens sit in `:root, [data-theme]` inside `@layer theme`, the
 * rest in a plain `:root`), in file order, with the section heading it sits
 * under and its trailing comment. Reading only the first `:root {` block
 * missed every colour once the theme fix moved them, so this walks the whole
 * file and tracks which rule each line is in. The values are resolved by the
 * same resolver the contrast contract uses, so the table and the test cannot
 * disagree.
 */
export function tokenRows(css: string, source: Map<string, string>): TokenRow[] {
  const rows: TokenRow[] = []
  const seen = new Set<string>()
  // One entry per open block: whether its selector list includes :root.
  const stack: boolean[] = []
  let prelude = ''
  let group = ''
  for (const line of css.split('\n')) {
    const heading = line.match(/\/\*\s*──\s*([^─]+?)\s*─/)
    if (heading) group = heading[1]!.replace(/:.*$/, '').trim()
    const decl = line.match(/^\s*(--[a-z0-9-]+)\s*:/)
    if (decl && stack.at(-1) && source.has(decl[1]!) && !seen.has(decl[1]!)) {
      const name = decl[1]!
      seen.add(name)
      const raw = source.get(name)!
      const note = line.match(/;\s*\/\*\s*(.+?)\s*\*\//)?.[1] ?? null
      const value = (theme: ThemeName) => {
        try {
          const rgb = resolveColor(raw, theme, source)
          return rgb ? toHex(rgb) : null
        } catch {
          return null
        }
      }
      const light = value('light')
      const dark = value('dark')
      rows.push({
        name,
        group,
        note,
        raw,
        light: light ?? raw,
        dark: dark ?? raw,
        isColor: light !== null && dark !== null,
      })
    }
    for (const ch of line.replace(/\/\*.*?\*\//g, '')) {
      if (ch === '{') {
        stack.push(prelude.split(',').some((sel) => sel.trim() === ':root'))
        prelude = ''
      } else if (ch === '}') {
        stack.pop()
        prelude = ''
      } else if (ch === ';') {
        prelude = ''
      } else {
        prelude += ch
      }
    }
    prelude += ' '
  }
  return rows
}
