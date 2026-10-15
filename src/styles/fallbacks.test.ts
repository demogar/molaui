// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * What a browser without `color-mix()` paints instead.
 *
 * Tailwind rewrites every `color-mix()` that reads a variable into a fallback
 * declaration plus the real one under `@supports (color: color-mix(in lab,
 * red, red))`, and the fallback is simply the mix's FIRST colour. The washes
 * were written layer-first (`var(--rojo) 12%, var(--cloth-pale)`), so the
 * shipped fallback for a 12% rojo wash was solid rojo, under --ink-muted
 * text. The supported floor (README, `build.cssTarget`) is past color-mix(),
 * so no supported browser reads these, but an unsupported one should degrade
 * to the ground, not to a region of alarm red.
 *
 * The rule held here, for every fallback Tailwind emits: an opaque mix falls
 * back to its majority colour (the ground a wash sits on), and a translucent
 * one (`<colour> p%, transparent`) to its own colour, which is the same hue at
 * full strength rather than a different colour. Compiled with Tailwind's own
 * compiler, as bridge.test.ts does, because the fallback only exists in the
 * output.
 */

const root = resolve(import.meta.dirname, '../..')
const styles = resolve(root, 'src/styles')

async function loadStylesheet(id: string, base: string) {
  const path = id === 'tailwindcss' ? resolve(root, 'node_modules/tailwindcss/index.css') : resolve(base, id)
  return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
}

/** Every Mola utility, so cloth.css's mixes are in the output as well as the tokens. */
const UTILITIES = [...readFileSync(resolve(styles, 'cloth.css'), 'utf8').matchAll(/^@utility ([\w-]+)/gm)].map((m) => m[1]!)

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/** Top-level comma split. */
function args(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    else if (s[i] === ',' && depth === 0) {
      out.push(s.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(s.slice(start).trim())
  return out
}

/** The colour a mix may fall back to under the rule above. */
function allowedFallback(mix: string): string {
  const [, a, b] = args(mix)
  const part = (p: string) => {
    const m = /^(.*?)\s+([\d.]+)%$/.exec(p)
    return m ? { colour: m[1]!.trim(), pct: Number(m[2]) } : { colour: p.trim(), pct: null as number | null }
  }
  const pa = part(a!)
  const pb = part(b!)
  if (pb.colour === 'transparent') return pa.colour
  if (pa.colour === 'transparent') return pb.colour
  const wa = pa.pct ?? (pb.pct === null ? 50 : 100 - pb.pct)
  return wa >= 50 ? pa.colour : pb.colour
}

/** The value with each color-mix() replaced by the colour it may fall back to. */
function expectedFallback(value: string): string {
  let out = ''
  let i = 0
  for (;;) {
    const at = value.indexOf('color-mix(', i)
    if (at === -1) return out + value.slice(i)
    let depth = 0
    let end = at + 'color-mix'.length
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++
      else if (value[end] === ')' && --depth === 0) break
    }
    out += value.slice(i, at) + allowedFallback(value.slice(at + 'color-mix('.length, end))
    i = end + 1
  }
}

let pairs: { prop: string; fallback: string; value: string }[]

beforeAll(async () => {
  const compiler = await compile(`@import 'tailwindcss';\n@import './mola.css';`, { base: styles, loadStylesheet })
  const css = compiler.build(UTILITIES)
  pairs = [
    ...css.matchAll(
      /([-\w]+):\s*([^;{}]+);\s*@supports \(color: color-mix\(in lab, red, red\)\) \{\s*([-\w]+):\s*([^;{}]+);\s*\}/g,
    ),
  ]
    .filter((m) => m[1] === m[3])
    .map((m) => ({ prop: m[1]!, fallback: m[2]!.trim(), value: m[4]!.trim() }))
})

describe('color-mix fallbacks', () => {
  it('finds the fallbacks Tailwind emits', () => {
    const props = pairs.map((p) => p.prop)
    expect(props).toEqual(expect.arrayContaining(['--rojo-soft', '--anil-soft', '--verde-soft', '--oro-soft', '--ink-soft']))
  })

  it('falls back to the ground for a wash, never to the layer colour', () => {
    expect(norm(pairs.find((p) => p.prop === '--rojo-soft')!.fallback)).toBe('var(--cloth-pale)')
  })

  it('falls back to the majority colour, or a translucent colour to itself', () => {
    const wrong = pairs
      .filter(({ fallback, value }) => {
        // Where Tailwind could resolve every input it keeps the mix and only
        // changes the space; that is the same colour.
        if (norm(fallback) === norm(value.replace(/in (oklab|oklch|lab|lch)/g, 'in srgb'))) return false
        return norm(fallback) !== norm(expectedFallback(value))
      })
      .map(({ prop, fallback, value }) => `${prop}: ${fallback}  (for ${value})`)
    expect(wrong).toEqual([])
  })
})
