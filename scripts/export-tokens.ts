/**
 * tokens.css -> design-token JSON in the W3C Design Tokens (DTCG) format.
 *
 * The CSS is the source of truth and this is a derived artefact, never the
 * other way round: a designer's token set that can be edited independently of
 * the code is a second palette, and two palettes drift. The JSON exists so the
 * same values can be loaded into Figma (Tokens Studio reads DTCG; Figma
 * Variables import it via the Tokens Studio sync) without anyone re-typing a
 * hex value.
 *
 * Colours are fully resolved per theme — `light-dark()`, `var()` and OKLab
 * `color-mix()` — with the same resolver the contrast contract uses, so what
 * Figma shows is what the browser paints.
 *
 *   npm run tokens          writes tokens/mola.tokens.json
 *   npm run tokens -- --check   fails if the committed file is stale (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { toHex } from '../src/tokens/color'
import { parseRootDeclarations, resolveColor, type ThemeName } from '../src/tokens/resolve'

const root = resolve(import.meta.dirname, '..')
const tokensCss = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8')
const themeCss = readFileSync(resolve(root, 'src/styles/theme.css'), 'utf8')
const decls = parseRootDeclarations(tokensCss)

type Token = { $type: string; $value: string | number; $description?: string }
type Group = { [key: string]: Token | Group }

function colours(theme: ThemeName): Group {
  const out: Group = {}
  for (const [name, value] of decls) {
    const rgb = (() => {
      try {
        return resolveColor(value, theme, decls)
      } catch {
        return null
      }
    })()
    if (rgb) out[name.slice(2)] = { $type: 'color', $value: toHex(rgb) }
  }
  return out
}

function themeLiterals(prefix: string, type: string): Group {
  const out: Group = {}
  const body = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g'))) {
    const value = m[2]!.trim()
    if (value.includes('var(')) continue
    out[m[1]!] = { $type: type, $value: value }
  }
  return out
}

function density(selector: string): Group {
  const block = new RegExp(`\\[data-density='${selector}'\\]\\s*\\{([^}]*)\\}`).exec(
    tokensCss.replace(/\/\*[\s\S]*?\*\//g, ''),
  )
  const out: Group = {}
  for (const m of (block?.[1] ?? '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    out[m[1]!] = { $type: 'dimension', $value: m[2]!.trim() }
  }
  return out
}

const comfortable: Group = {}
for (const name of ['control-h', 'control-h-sm', 'control-h-lg', 'control-px', 'row-h']) {
  comfortable[name] = { $type: 'dimension', $value: decls.get(`--${name}`)! }
}

const doc = {
  $description:
    'Mola UI design tokens, generated from src/styles/tokens.css by scripts/export-tokens.ts. Do not edit by hand.',
  color: { light: colours('light'), dark: colours('dark') },
  font: themeLiterals('font', 'fontFamily'),
  text: themeLiterals('text', 'dimension'),
  leading: themeLiterals('leading', 'number'),
  tracking: themeLiterals('tracking', 'dimension'),
  wdth: themeLiterals('wdth', 'number'),
  radius: themeLiterals('radius', 'dimension'),
  motion: {
    'cut': { $type: 'duration', $value: decls.get('--motion-cut')! },
    'base': { $type: 'duration', $value: decls.get('--motion-base')! },
    'slow': { $type: 'duration', $value: decls.get('--motion-slow')! },
    'ease-cut': { $type: 'cubicBezier', $value: '0.2, 0, 0, 1' },
  },
  density: { comfortable, compact: density('compact'), spacious: density('spacious') },
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
  if (current !== json) {
    console.error('tokens/mola.tokens.json is stale. Run `npm run tokens` and commit the result.')
    process.exit(1)
  }
  console.log('tokens/mola.tokens.json is up to date.')
} else {
  writeFileSync(target, json)
  console.log(`Wrote ${target}`)
}
