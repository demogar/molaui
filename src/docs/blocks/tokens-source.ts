import themeCss from '../../styles/theme.css?raw'
import tokensCss from '../../styles/tokens.css?raw'
import { parseRootDeclarations, resolveColor, type ThemeName } from '../../tokens/resolve'
import { toHex } from '../../tokens/color'

/** tokens.css as written, parsed once, for every docs page that shows a value. */
export const decls = parseRootDeclarations(tokensCss)
export { tokensCss }

/** The body of the first block whose selector matches, comments stripped. */
function block(css: string, selector: RegExp): Map<string, string> {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = stripped.search(selector)
  const out = new Map<string, string>()
  if (start < 0) return out
  const open = stripped.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++
    if (stripped[i] === '}') depth--
    if (depth === 0) {
      end = i
      break
    }
  }
  for (const m of stripped.slice(open + 1, end).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g)) {
    out.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim())
  }
  return out
}

export type DensityName = 'compact' | 'comfortable' | 'spacious'
export const DENSITIES: DensityName[] = ['compact', 'comfortable', 'spacious']

/**
 * The literal scale theme.css declares in `@theme` (the comfortable type
 * scale), which tokens.css re-declares per density.
 */
export const themeScale = block(themeCss, /@theme\s*\{/)

/** What each `[data-density]` block in tokens.css redefines. */
export const densityOverrides: Record<DensityName, Map<string, string>> = {
  compact: block(tokensCss, /\[data-density='compact'\]\s*\{/),
  comfortable: new Map(),
  spacious: block(tokensCss, /\[data-density='spacious'\]\s*\{/),
}

/**
 * Tailwind's own spacing unit. Mola does not declare it for comfortable and
 * spacious, so those densities inherit Tailwind v4's default; only compact
 * redefines it. Kept here, named, rather than buried in a table cell.
 */
export const TAILWIND_SPACING = '0.25rem'

/** A metric's value in one density: its override, else the base value from tokens.css or theme.css. */
export function densityValue(name: string, density: DensityName): string | undefined {
  return densityOverrides[density].get(name) ?? decls.get(name) ?? themeScale.get(name) ?? (name === '--spacing' ? TAILWIND_SPACING : undefined)
}

/** `0.21875rem` → 3.5, `36px` → 36. The docs root font size is 16px. */
export function toPx(value: string): number | null {
  const m = value.match(/^(-?[\d.]+)(px|rem)$/)
  if (!m) return null
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
}

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
 * Every custom property in the :root block of tokens.css, in file order, with
 * the section heading it sits under and its trailing comment. The values are
 * resolved by the same resolver the contrast contract uses, so the table and
 * the test cannot disagree.
 */
export function tokenRows(css: string = tokensCss, source: Map<string, string> = decls): TokenRow[] {
  const start = css.search(/:root\s*\{/)
  const lines = css.slice(start).split('\n')
  const rows: TokenRow[] = []
  let group = ''
  let depth = 0
  for (const line of lines) {
    const heading = line.match(/\/\*\s*──\s*([^─]+?)\s*─/)
    if (heading) group = heading[1]!.replace(/:.*$/, '').trim()
    const decl = line.match(/^\s*(--[a-z0-9-]+)\s*:/)
    if (decl && depth === 1 && source.has(decl[1]!)) {
      const name = decl[1]!
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
      if (ch === '{') depth++
      if (ch === '}') depth--
    }
    if (depth <= 0 && rows.length) break
  }
  return rows
}
