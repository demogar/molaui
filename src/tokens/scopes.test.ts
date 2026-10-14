import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PAIRS } from './pairings'
import { parseRootDeclarations } from './resolve'
import { tokenRows } from './rows'
import { allows, COLOR_PREFIXES, COLOR_SCOPES, SCOPES, type Scope } from './scopes'

/**
 * The scopes in ./scopes.ts are a promise the agent docs and the Figma export
 * repeat, so they are held to the same three sources the rest of the system
 * is: the tokens that exist (tokens.css and theme.css), the pairings the
 * contrast contract measures (./pairings.ts), and what the components
 * actually write.
 */

const src = resolve(import.meta.dirname, '..')
const css = readFileSync(join(src, 'styles/tokens.css'), 'utf8')
const decls = parseRootDeclarations(css)
const bridged = new Set(
  [...readFileSync(join(src, 'styles/theme.css'), 'utf8').matchAll(/--color-([a-z0-9-]+):/g)].map((m) => `--${m[1]!}`),
)
/** A colour token: one theme.css bridges to Tailwind, or one the resolver flattens to a colour in both themes. */
const colourTokens = new Set([...bridged, ...tokenRows(css, decls).filter((r) => r.isColor).map((r) => r.name)])

const has = (name: string, ...scopes: Scope[]) => (COLOR_SCOPES[name]?.scopes ?? []).some((s) => scopes.includes(s))

describe('colour token scopes', () => {
  it('scope every colour token in tokens.css', () => {
    const missing = [...colourTokens].filter((name) => !COLOR_SCOPES[name]?.scopes.length)
    expect(missing).toEqual([])
  })

  it('name only tokens that exist, with scopes from the closed set', () => {
    const unknown = Object.keys(COLOR_SCOPES).filter((name) => !colourTokens.has(name))
    expect(unknown).toEqual([])
    const bad = Object.entries(COLOR_SCOPES).flatMap(([name, e]) => e.scopes.filter((s) => !(s in SCOPES)).map((s) => `${name}: ${s}`))
    expect(bad).toEqual([])
  })

  it('agree with every promised pairing: a foreground is text, edge or mark, a ground is surface', () => {
    const disagree = PAIRS.flatMap(([fg, bg, min]) => [
      ...(has(fg, 'text', 'edge', 'mark') ? [] : [`${fg} is a foreground on ${bg} (${min}) but not text-, edge- or mark-scoped`]),
      ...(has(bg, 'surface') ? [] : [`${bg} is a ground under ${fg} (${min}) but not surface-scoped`]),
    ])
    expect(disagree).toEqual([])
  })

  it('let no overlay carry a measured pairing: what shows through it is unknown', () => {
    const measured = PAIRS.flatMap(([fg, bg]) => [fg, bg]).filter((name) => has(name, 'overlay'))
    expect(measured).toEqual([])
  })
})

describe('colour utilities in components and patterns', () => {
  /**
   * Tailwind compiles `text-cloth-pale` as happily as `bg-cloth-pale`, so the
   * only thing that keeps the components inside the scopes is this check. It
   * reads the shipped source (stories, tests and story fixtures excluded: a
   * story may show a misuse on purpose), strips comments, and reports each
   * colour utility whose prefix the token's scopes do not allow. Arbitrary
   * values (`shadow-[inset_0_-1px_0_var(--keyline)]`) are not checked: the
   * property is inside free text.
   */
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
      return /\.tsx?$/.test(name) && !/\.(stories|test)\.tsx?$/.test(name) ? [path] : []
    })
  }
  const files = [...walk(join(src, 'components')), ...walk(join(src, 'patterns'))]
  const prefixes = [...COLOR_PREFIXES].sort((a, b) => b.length - a.length)

  it('reads the components', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('use each token only through a utility its scopes allow', () => {
    const misuses: string[] = []
    let seen = 0
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1')
      for (const word of text.match(/[\w\-:/[\]!.&()=,@>*~+%]+/g) ?? []) {
        const utility = word.split(':').at(-1)!.replace(/^!/, '').replace(/\/\d+$/, '')
        const prefix = prefixes.find((p) => utility.startsWith(`${p}-`) && bridged.has(`--${utility.slice(p.length + 1)}`))
        if (!prefix) continue
        const name = `--${utility.slice(prefix.length + 1)}`
        seen++
        if (!allows(name, prefix)) {
          misuses.push(`${relative(src, file)}: ${utility} (${name} is ${COLOR_SCOPES[name]?.scopes.join(', ') ?? 'unscoped'})`)
        }
      }
    }
    // A tokenizer that silently matched nothing would pass; the components write some eight hundred.
    expect(seen).toBeGreaterThan(500)
    expect(misuses).toEqual([])
  })
})
