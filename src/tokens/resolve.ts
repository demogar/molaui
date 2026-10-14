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

/**
 * `--name: value;` declarations from every rule whose selector list includes
 * `:root` (`:root { … }`, `:root, [data-theme] { … }`), at any `@layer`
 * depth. The colour tokens and the length tokens are separate rules, because
 * only the colours are redeclared on `[data-theme]`; see tokens.css.
 */
export function parseRootDeclarations(css: string): Map<string, string> {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const decls = new Map<string, string>()
  let preludeStart = 0
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i]
    if (ch === '}' || ch === ';') preludeStart = i + 1
    if (ch !== '{') continue
    const selectors = stripped.slice(preludeStart, i).split(',').map((s) => s.trim())
    preludeStart = i + 1
    if (!selectors.includes(':root')) continue
    const end = stripped.indexOf('}', i)
    for (const m of stripped.slice(i + 1, end).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      decls.set(m[1]!, m[2]!.replace(/\s+/g, ' ').trim())
    }
  }
  if (decls.size === 0) throw new Error('No :root block')
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

/**
 * A token that may be translucent, as a colour and an alpha: what
 * `resolveColor` refuses, because it cannot know the ground. Only the one
 * translucent form tokens.css writes is understood,
 * `color-mix(in oklab, <colour> p%, transparent)`, which the browser paints as
 * the colour at p% alpha (the mix is premultiplied, so the hue is untouched).
 * The caller composites it with `over()` onto a ground it chooses.
 */
export function resolveLayer(name: string, theme: ThemeName, decls: Map<string, string>): { rgb: RGB; alpha: number } {
  const raw = decls.get(name)
  if (!raw) throw new Error(`Unknown token ${name}`)
  const layer = resolveTranslucent(raw, theme, decls)
  if (!layer) throw new Error(`Token ${name} is not a colour mixed toward transparent`)
  return layer
}

/**
 * `resolveLayer` for a value rather than a token name, so a colour written
 * inside another token (the shadow colour in `--elevation-raised`) resolves
 * too. Follows `light-dark()` and `var()` down to an opaque colour or to the
 * one translucent form; anything else is `null`.
 */
export function resolveTranslucent(
  value: string,
  theme: ThemeName,
  decls: Map<string, string>,
  seen: Set<string> = new Set(),
): { rgb: RGB; alpha: number } | null {
  const v = value.trim()
  const opaque = resolveColor(v, theme, decls)
  if (opaque) return { rgb: opaque, alpha: 1 }

  const ld = inner(v, 'light-dark')
  if (ld !== null) {
    const [light, dark] = splitArgs(ld)
    return resolveTranslucent(theme === 'light' ? light! : dark!, theme, decls, seen)
  }

  const ref = inner(v, 'var')
  if (ref !== null) {
    const name = splitArgs(ref)[0]!
    if (seen.has(name)) throw new Error(`Cycle at ${name}`)
    const target = decls.get(name)
    return target ? resolveTranslucent(target, theme, decls, new Set([...seen, name])) : null
  }

  const mix = inner(v, 'color-mix')
  const [space, a, b] = mix === null ? [] : splitArgs(mix)
  const m = a ? /^(.*)\s+([\d.]+)%$/.exec(a) : null
  const rgb = m ? resolveColor(m[1]!, theme, decls) : null
  if (space !== 'in oklab' || b !== 'transparent' || !m || !rgb) return null
  return { rgb, alpha: Number(m[2]) / 100 }
}

/** Resolve a token by name, in one theme. */
export function token(name: string, theme: ThemeName, decls: Map<string, string>): RGB {
  const raw = decls.get(name)
  if (!raw) throw new Error(`Unknown token ${name}`)
  const rgb = resolveColor(raw, theme, decls)
  if (!rgb) throw new Error(`Token ${name} does not resolve to an opaque colour`)
  return rgb
}
