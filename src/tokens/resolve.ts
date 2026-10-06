import { mixOklab, parseHex, type RGB } from './color'

/**
 * A resolver for exactly the subset of CSS that `tokens.css` is allowed to
 * use: hex literals, `light-dark(a, b)`, `var(--name)` and
 * `color-mix(in oklab, a p%, b)`. It exists so the contrast contract is
 * checked against the file as written, not against a second copy of the
 * palette that can drift from it.
 *
 * Anything outside that subset — a `transparent` mix, a named colour — is
 * deliberately unresolvable here and returns `null`, because its rendered
 * colour depends on what is painted underneath it.
 */

export type ThemeName = 'light' | 'dark'

/** `--name: value;` declarations from the first `:root { … }` block. */
export function parseRootDeclarations(css: string): Map<string, string> {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = stripped.search(/:root\s*\{/)
  if (start < 0) throw new Error('No :root block')
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
  const body = stripped.slice(open + 1, end)
  const decls = new Map<string, string>()
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    decls.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim())
  }
  return decls
}

/** Split a function's argument list on top-level commas. */
function splitArgs(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

function inner(value: string, fn: string): string | null {
  const v = value.trim()
  if (!v.startsWith(fn + '(') || !v.endsWith(')')) return null
  return v.slice(fn.length + 1, -1)
}

export function resolveColor(
  value: string,
  theme: ThemeName,
  decls: Map<string, string>,
  seen: Set<string> = new Set(),
): RGB | null {
  const v = value.trim()
  if (/^#[0-9a-f]{3,6}$/i.test(v)) return parseHex(v)

  const ld = inner(v, 'light-dark')
  if (ld !== null) {
    const [light, dark] = splitArgs(ld)
    return resolveColor(theme === 'light' ? light! : dark!, theme, decls, seen)
  }

  const ref = inner(v, 'var')
  if (ref !== null) {
    const name = splitArgs(ref)[0]!
    if (seen.has(name)) throw new Error(`Cycle at ${name}`)
    const target = decls.get(name)
    if (!target) return null
    return resolveColor(target, theme, decls, new Set([...seen, name]))
  }

  const mix = inner(v, 'color-mix')
  if (mix !== null) {
    const [space, a, b] = splitArgs(mix)
    if (space !== 'in oklab' || !a || !b) return null
    const m = /^(.*)\s+([\d.]+)%$/.exec(a)
    if (!m) return null
    const ca = resolveColor(m[1]!, theme, decls, seen)
    const cb = resolveColor(b, theme, decls, seen)
    if (!ca || !cb) return null
    return mixOklab(ca, Number(m[2]), cb)
  }

  return null
}

/** Resolve a token by name, in one theme. */
export function token(name: string, theme: ThemeName, decls: Map<string, string>): RGB {
  const raw = decls.get(name)
  if (!raw) throw new Error(`Unknown token ${name}`)
  const rgb = resolveColor(raw, theme, decls)
  if (!rgb) throw new Error(`Token ${name} does not resolve to an opaque colour`)
  return rgb
}
