/**
 * tokens.css + theme.css -> design-token JSON in the W3C Design Tokens (DTCG)
 * format, version 2025.10.
 *
 * The CSS is the source of truth and this is a derived artefact, never the
 * other way round: a designer's token set that can be edited independently of
 * the code is a second palette, and two palettes drift. The JSON exists so the
 * same values can be loaded into design tools (Figma variables, Tokens
 * Studio, Style Dictionary) without anyone re-typing a value.
 *
 * Colours are fully resolved per theme — `light-dark()`, `var()` and OKLab
 * `color-mix()` — with the same resolver the contrast contract uses, so what a
 * design tool shows is what the browser paints. Translucent colours (the
 * scrim, the backdrop, a keyline on ink) keep their alpha.
 *
 * Two rules keep the file honest, and both used to be broken:
 *
 *   - Every declaration in tokens.css and in theme.css's `@theme` block has a
 *     destination in the JSON, or a reason in SKIPPED for having none. The
 *     first version dropped a third of the set without a word: translucent
 *     colours failed to resolve and were left out, and shadows, the cut
 *     width, containers and breakpoints were never read at all.
 *   - The document is checked against the format (src/tokens/dtcg.ts) before
 *     it is written or compared, so a value no importer accepts fails here
 *     rather than in someone's design tool.
 *
 *   npm run tokens          writes tokens/mola.tokens.json
 *   npm run tokens:check    fails if the committed file is stale or invalid (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { type RGB, toHex } from '../src/tokens/color'
import { validateDtcg } from '../src/tokens/dtcg'
import { parseRootDeclarations, resolveTranslucent, type ThemeName } from '../src/tokens/resolve'
import { figmaScopesOf } from '../src/tokens/scopes'

const root = resolve(import.meta.dirname, '..')
const tokensCss = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8')
const themeCss = readFileSync(resolve(root, 'src/styles/theme.css'), 'utf8')
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

type Token = { $type: string; $value: unknown; $description?: string; $extensions?: Record<string, unknown> }
type Group = { [key: string]: Token | Group | string }

/* ── read every declaration, so none can go missing ─────────────────── */

const decls = parseRootDeclarations(tokensCss)

function densityBlock(name: string): Map<string, string> {
  const block = new RegExp(`\\[data-density='${name}'\\]\\s*\\{([^}]*)\\}`).exec(strip(tokensCss))
  if (!block) throw new Error(`tokens.css has no [data-density='${name}'] block`)
  return new Map([...block[1]!.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
}
const compact = densityBlock('compact')
const spacious = densityBlock('spacious')

/** The literal `@theme { … }` block of theme.css, nested @keyframes removed. `@theme inline` holds only var() bridges. */
function themeLiterals(): Map<string, string> {
  const css = strip(themeCss)
  const start = css.search(/@theme\s*\{/)
  if (start < 0) throw new Error('theme.css has no @theme block')
  let depth = 0
  let body = ''
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    const ch = css[i]!
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth === 1 && ch !== '{') body += ch
    if (depth === 0) break
  }
  return new Map([...body.matchAll(/(--[a-z0-9-]+(?:-\*)?)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
}
const theme = themeLiterals()

const claimed = new Set<string>()
const claim = (source: string, name: string) => claimed.add(`${source} ${name}`)

/**
 * Declarations with no DTCG destination, and why. Anything not claimed and
 * not listed here fails the export.
 */
const SKIPPED: Record<string, string> = {
  '--default-font-family': 'Tailwind plumbing: an alias of --font-ui for preflight',
  '--default-transition-duration': 'Tailwind plumbing: an alias of --motion-cut',
  '--default-transition-timing-function': 'Tailwind plumbing: an alias of --ease-cut',
}
const SKIPPED_PREFIX: [RegExp, string][] = [
  [/-\*$/, 'a namespace reset (`--color-*: initial`), not a token'],
  [/^--animate-/, 'a CSS animation shorthand; DTCG has no animation type'],
]

/* ── values, coerced to the format ──────────────────────────────────── */

function dimension(raw: string): { value: number; unit: 'px' | 'rem' } {
  const v = raw.trim()
  if (v === '0') return { value: 0, unit: 'px' }
  const m = /^(-?[\d.]+)(px|rem)$/.exec(v)
  if (!m) throw new Error(`Not a px or rem dimension: ${raw}`)
  return { value: Number(m[1]), unit: m[2] as 'px' | 'rem' }
}

function duration(raw: string): { value: number; unit: 'ms' | 's' } {
  const m = /^([\d.]+)(ms|s)$/.exec(raw.trim())
  if (!m) throw new Error(`Not a duration: ${raw}`)
  return { value: Number(m[1]), unit: m[2] as 'ms' | 's' }
}

function number(raw: string): number {
  const n = Number(raw.trim())
  if (!Number.isFinite(n)) throw new Error(`Not a number: ${raw}`)
  return n
}

/** `'Archivo Variable', 'Archivo', system-ui` -> ['Archivo Variable', 'Archivo', 'system-ui'] */
const fontFamily = (raw: string) => raw.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))

function cubicBezier(raw: string): number[] {
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(raw.trim())
  if (!m) throw new Error(`Not a cubic-bezier(): ${raw}`)
  return m[1]!.split(',').map(number)
}

const round = (n: number, places = 4) => Math.round(n * 10 ** places) / 10 ** places

function colorValue({ rgb, alpha }: { rgb: RGB; alpha: number }) {
  const ints = rgb.map((c) => Math.round(c)) as unknown as RGB
  return {
    colorSpace: 'srgb',
    components: ints.map((c) => round(c / 255)),
    ...(alpha < 1 ? { alpha: round(alpha) } : {}),
    hex: toHex(ints),
  }
}

/**
 * What a Figma import needs beyond the value: the VariableScopes the token may
 * be applied to (from src/tokens/scopes.ts, so a surface cannot be picked as a
 * text fill in the file any more than in the code) and its code syntax, so
 * Dev Mode shows `var(--cloth-pale)` rather than a hex. Extensions are the
 * DTCG's place for tool-specific data; a reader that does not know them
 * ignores them, so this is additive.
 */
function figma(name: string) {
  return {
    'com.figma.scopes': figmaScopesOf(name),
    'com.figma.codeSyntax': { WEB: `var(${name})` },
  }
}

/* ── shadows ────────────────────────────────────────────────────────── */

/** Split on top-level separators (commas between layers, spaces between parts). */
function splitTop(s: string, sep: RegExp): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (depth === 0 && sep.test(ch)) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** A shadow length: `0`, `14px`, `var(--cut-w)`, `calc(var(--cut-w) + 2px)`, all in px. */
function lengthPx(raw: string): number | null {
  const v = raw.trim()
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v)
  if (ref) {
    const target = decls.get(ref[1]!)
    return target === undefined ? null : lengthPx(target)
  }
  const calc = /^calc\((.+)\)$/.exec(v)
  if (calc) {
    const terms = calc[1]!.split(/\s+([+-])\s+/)
    let total = lengthPx(terms[0]!)
    for (let i = 1; i < terms.length && total !== null; i += 2) {
      const next = lengthPx(terms[i + 1]!)
      total = next === null ? null : total + (terms[i] === '+' ? next : -next)
    }
    return total
  }
  if (v === '0') return 0
  const m = /^(-?[\d.]+)px$/.exec(v)
  return m ? Number(m[1]) : null
}

function shadow(raw: string, themeName: ThemeName) {
  const layers = splitTop(raw, /,/).map((layer) => {
    const parts = splitTop(layer, /\s/)
    const inset = parts[0] === 'inset'
    const rest = inset ? parts.slice(1) : parts
    const lengths: number[] = []
    let colour: string | null = null
    for (const part of rest) {
      const px = lengthPx(part)
      if (px !== null && colour === null) lengths.push(px)
      else colour = colour === null ? part : `${colour} ${part}`
    }
    const resolved = colour === null ? null : resolveTranslucent(colour, themeName, decls)
    if (!resolved || lengths.length < 2 || lengths.length > 4) throw new Error(`Cannot read the shadow layer "${layer}"`)
    const [x, y, blur = 0, spread = 0] = lengths
    const px = (value: number) => ({ value: round(value), unit: 'px' })
    return {
      color: colorValue(resolved),
      offsetX: px(x!),
      offsetY: px(y!),
      blur: px(blur),
      spread: px(spread),
      ...(inset ? { inset: true } : {}),
    }
  })
  return layers.length === 1 ? layers[0] : layers
}

const SHADOWS = new Set(['--cut', '--focus-ring', '--focus-ring-inset', '--elevation-raised'])

/* ── groups ─────────────────────────────────────────────────────────── */

/** The colour and shadow tokens declared on `:root, [data-theme]`. */
const themed = new Set(
  [...strip(tokensCss).matchAll(/:root,\s*\[data-theme\]\s*\{([^}]*)\}/g)].flatMap((m) =>
    [...m[1]!.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((d) => d[1]!),
  ),
)

function colours(themeName: ThemeName): Group {
  const out: Group = {}
  for (const name of themed) {
    if (SHADOWS.has(name)) continue
    const layer = resolveTranslucent(decls.get(name)!, themeName, decls)
    if (!layer) continue // reported as unclaimed below
    claim('tokens.css', name)
    out[name.slice(2)] = { $type: 'color', $value: colorValue(layer), $extensions: figma(name) }
  }
  return out
}

function shadows(themeName: ThemeName): Group {
  const out: Group = {}
  for (const name of SHADOWS) {
    claim('tokens.css', name)
    out[name.slice(2)] = { $type: 'shadow', $value: shadow(decls.get(name)!, themeName) }
  }
  return out
}

/** Every theme.css literal under `--<prefix>-`, coerced by `make`. */
function fromTheme(prefix: string, $type: string, make: (raw: string) => unknown, describe?: string, except: string[] = []): Group {
  const out: Group = {}
  if (describe) out.$description = describe
  for (const [name, raw] of theme) {
    if (!name.startsWith(`--${prefix}-`) || name.endsWith('-*') || except.includes(name)) continue
    claim('theme.css', name)
    out[name.slice(prefix.length + 3)] = { $type, $value: make(raw) }
  }
  return out
}

/**
 * The density modes, with one key set. Compact and spacious re-declare only
 * what they change, so each mode is the comfortable value overlaid with its
 * own: a design tool needs every variable in every mode, and the first export
 * gave comfortable 5 keys, compact 12 and spacious 10.
 */
function densities(): Group {
  const keys = [...new Set([...compact.keys(), ...spacious.keys()])]
  const comfortableValue = (name: string) => decls.get(name) ?? theme.get(name)
  const mode = (overrides: Map<string, string> | null, source: string): Group => {
    const out: Group = {}
    for (const name of keys) {
      const raw = overrides?.get(name) ?? comfortableValue(name)
      if (raw === undefined) throw new Error(`${name} has no comfortable value to fall back on`)
      if (overrides?.has(name)) claim(source, name)
      out[name.slice(2)] = { $type: 'dimension', $value: dimension(raw) }
    }
    return out
  }
  for (const name of keys) {
    if (decls.has(name)) claim('tokens.css', name)
    if (theme.has(name)) claim('theme.css', name)
  }
  return {
    $description:
      'Set by data-density on any element. Each mode lists every density-dependent token; comfortable is the product default.',
    comfortable: mode(null, ''),
    compact: mode(compact, 'tokens.css [compact]'),
    spacious: mode(spacious, 'tokens.css [spacious]'),
  }
}

function single(source: 'tokens.css' | 'theme.css', name: string, $type: string, make: (raw: string) => unknown): Token {
  const raw = source === 'tokens.css' ? decls.get(name) : theme.get(name)
  if (raw === undefined) throw new Error(`${source} declares no ${name}`)
  claim(source, name)
  return { $type, $value: make(raw) }
}

const doc = {
  $description:
    'Mola UI design tokens (DTCG 2025.10), generated from src/styles/tokens.css and theme.css by scripts/export-tokens.ts. Do not edit by hand.',
  color: { light: colours('light'), dark: colours('dark') },
  shadow: {
    $description: 'The cut (keyline), the focus rings and the one elevation, resolved per theme.',
    light: shadows('light'),
    dark: shadows('dark'),
  },
  font: fromTheme('font', 'fontFamily', fontFamily),
  text: fromTheme('text', 'dimension', dimension, 'The comfortable type scale; density modes re-scale 2xs to xl.'),
  leading: fromTheme('leading', 'number', number, 'Line height, as a multiple of the font size.'),
  tracking: fromTheme(
    'tracking',
    'number',
    (raw) => {
      if (!/^-?[\d.]+em$/.test(raw.trim())) throw new Error(`Tracking is written in em: ${raw}`)
      return number(raw.trim().slice(0, -2))
    },
    'Letter spacing as a multiple of the font size (CSS em). DTCG dimensions are px or rem only, and tracking must scale with the type.',
  ),
  wdth: fromTheme('wdth', 'number', number, "Archivo's and Martian Mono's width axis (font-variation-settings 'wdth')."),
  radius: {
    default: single('theme.css', '--radius', 'dimension', dimension),
    ...fromTheme('radius', 'dimension', dimension),
  },
  size: {
    'cut-w': single('tokens.css', '--cut-w', 'dimension', dimension),
    'cut-reveal': single('tokens.css', '--cut-reveal', 'dimension', dimension),
  },
  motion: {
    'cut': single('tokens.css', '--motion-cut', 'duration', duration),
    'base': single('tokens.css', '--motion-base', 'duration', duration),
    'slow': single('tokens.css', '--motion-slow', 'duration', duration),
    'ease-cut': single('theme.css', '--ease-cut', 'cubicBezier', cubicBezier),
  },
  container: {
    ...fromTheme('container', 'dimension', dimension, 'Max widths (max-w-*) and container-query steps (@sm …).', [
      '--container-reading',
    ]),
    // Counted in the text's own characters (CSS ch), so it follows the type
    // size. DTCG dimensions are px or rem only, so it goes out as a number
    // and says its unit, rather than as a rem that would be wrong at every
    // size but one.
    reading: {
      ...single('theme.css', '--container-reading', 'number', (raw) => {
        if (!/^[\d.]+ch$/.test(raw.trim())) throw new Error(`The reading measure is written in ch: ${raw}`)
        return number(raw.trim().slice(0, -2))
      }),
      $description: 'The prose measure, in ch (characters of the element’s own font): max-w-reading.',
    },
  },
  breakpoint: fromTheme('breakpoint', 'dimension', dimension, 'Viewport min-widths (sm: … 2xl:).'),
  density: densities(),
}

/* ── nothing left behind ────────────────────────────────────────────── */

const reason = (name: string) => SKIPPED[name] ?? SKIPPED_PREFIX.find(([re]) => re.test(name))?.[1]
const unclaimed = [
  ...[...decls.keys()].filter((n) => !claimed.has(`tokens.css ${n}`)).map((n) => `tokens.css ${n}`),
  ...[...compact.keys()].filter((n) => !claimed.has(`tokens.css [compact] ${n}`)).map((n) => `tokens.css [compact] ${n}`),
  ...[...spacious.keys()].filter((n) => !claimed.has(`tokens.css [spacious] ${n}`)).map((n) => `tokens.css [spacious] ${n}`),
  ...[...theme.keys()].filter((n) => !claimed.has(`theme.css ${n}`) && !reason(n)).map((n) => `theme.css ${n}`),
]
if (unclaimed.length) {
  console.error(
    `These declarations have no place in tokens/mola.tokens.json:\n  ${unclaimed.join('\n  ')}\n` +
      'Export them in scripts/export-tokens.ts, or list them in SKIPPED with the reason they cannot be.',
  )
  process.exit(1)
}

const errors = validateDtcg(doc)
if (errors.length) {
  console.error(`tokens/mola.tokens.json would not be valid DTCG:\n  ${errors.join('\n  ')}`)
  process.exit(1)
}

const json = JSON.stringify(doc, null, 2) + '\n'
const target = resolve(root, 'tokens/mola.tokens.json')

if (process.argv.includes('--check')) {
  const current = (() => {
    try {
      return readFileSync(target, 'utf8')
    } catch {
      return ''
    }
  })()
  const committed = (() => {
    try {
      return validateDtcg(JSON.parse(current))
    } catch {
      return ['it is not JSON']
    }
  })()
  if (committed.length) {
    console.error(`tokens/mola.tokens.json is not valid DTCG:\n  ${committed.join('\n  ')}`)
    process.exit(1)
  }
  if (current !== json) {
    console.error('tokens/mola.tokens.json is stale. Run `npm run tokens` and commit the result.')
    process.exit(1)
  }
  console.log('tokens/mola.tokens.json is up to date and valid DTCG.')
} else {
  writeFileSync(target, json)
  console.log(`Wrote ${target}`)
}
