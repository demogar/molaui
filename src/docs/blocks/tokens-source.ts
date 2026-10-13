import themeCss from '../../styles/theme.css?raw'
import tokensCss from '../../styles/tokens.css?raw'
import { parseRootDeclarations } from '../../tokens/resolve'
import { tokenRows as rowsOf, type TokenRow } from '../../tokens/rows'

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

export type { TokenRow }

/** Every token in tokens.css, resolved per theme; the logic is in src/tokens/rows.ts. */
export function tokenRows(css: string = tokensCss, source: Map<string, string> = decls): TokenRow[] {
  return rowsOf(css, source)
}
