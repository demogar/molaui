/**
 * The custom properties declared in the first rule of `css` whose prelude
 * matches `selector`, comments stripped. Its own module, with no `?raw`
 * import, so scripts/agent-docs.ts can read theme.css with it for the
 * Markdown twins, and the docs blocks read the same declarations the twins do.
 */
export function block(css: string, selector: RegExp): Map<string, string> {
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

/** `40rem` → 640, `920px` → 920, `65ch` → null. The root font size is 16px. */
export function toPx(value: string): number | null {
  const m = value.match(/^(-?[\d.]+)(px|rem)$/)
  if (!m) return null
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
}
