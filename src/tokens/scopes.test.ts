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

/** The shipped source: components and patterns, without stories, tests or story fixtures (a story may show a misuse on purpose). */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    return /\.tsx?$/.test(name) && !/\.(stories|test)\.tsx?$/.test(name) ? [path] : []
  })
}
const files = [...walk(join(src, 'components')), ...walk(join(src, 'patterns'))]
const source = (file: string) =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')

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
  const prefixes = [...COLOR_PREFIXES].sort((a, b) => b.length - a.length)

  it('reads the components', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('use each token only through a utility its scopes allow', () => {
    const misuses: string[] = []
    let seen = 0
    for (const file of files) {
      const text = source(file)
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

describe('text on surfaces', () => {
  /**
   * Every surface the shipped code puts text on must have that text measured
   * on it. `--cloth-deep` is why this exists: tab hovers and disabled checked
   * boxes put ink on it while the contract measured nothing there, because a
   * pairing was measured only if someone thought to list it. This test reads
   * the pairings off the code instead.
   *
   * The heuristic is narrow on purpose, so that a failure is a real pairing:
   *
   * - The unit is ONE ELEMENT's classes: one `cn(…)` call, one array of
   *   string literals (`checkboxBoxClasses`), or one string literal outside
   *   both. Inherited text colour is not followed. A JSX tree cannot be read
   *   reliably as text, and guessing at it would invent pairings. The
   *   per-theme floor below covers what this misses, instead of a guess.
   * - Inside `cn()`, an argument that is a plain string always applies. Any
   *   other argument (`open && '…'`, `a ? '…' : '…'`) is a condition, and each
   *   string in it is tried alone on top of the plain ones, one condition at a
   *   time. Trying every combination was the first version: it paired arms
   *   that never hold together (a calendar day that is both the range end and
   *   disabled), and all it found was noise.
   * - A later class with the same variants replaces an earlier one, as
   *   tailwind-merge does: `hover:bg-transparent` cancels `hover:bg-ink-soft`.
   * - State variants pair by state, and a state takes the most specific class
   *   that applies to it. In `bg-cloth-shade hover:bg-cloth-deep text-ink-2
   *   hover:text-ink`, the hover state is `--ink` on `--cloth-deep`, and the
   *   rest state is `--ink-2` on `--cloth-shade`. `data-disabled:data-checked:`
   *   takes its text from `data-disabled:` when nothing more specific sets it.
   * - Utilities that style a different element are dropped: pseudo-elements
   *   (`before:`, `placeholder:`, `marker:`…) and descendant variants (`*:`,
   *   `[&_td]:`, `[&>x]:`).
   * - Two states can hold at once (a menu item that is highlighted AND
   *   disabled), so every two variant sets are also read together. That is
   *   where most of what this test found was. A combination that cannot hold
   *   is skipped: `has-checked` with `not-has-checked`, or a hover under
   *   `pointer-events-none`. On a tie between two classes of the same weight,
   *   both are read, since which one wins is up to Tailwind's variant order.
   * - The `on-ink` utility counts as `bg-ink` with `--on-ink` text, which is
   *   how cloth.css writes it.
   */
  const OTHER_ELEMENT = /^(before|after|placeholder|marker|selection|file|first-letter|first-line|backdrop)$|^\*|^\[.*[_>\s].*\]$/
  const RESET = new Set(['transparent', 'none', 'inherit', 'current'])
  const scoped = (name: string, scope: Scope) => COLOR_SCOPES[name]?.scopes.includes(scope) ?? false

  /** Split on top-level occurrences of `sep`, outside brackets, parens and quotes. */
  function split(text: string, sep: string) {
    const parts: string[] = []
    let depth = 0
    let quote: string | null = null
    let cur = ''
    for (const ch of text) {
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === "'" || ch === '"' || ch === '`') quote = ch
      else if ('[({'.includes(ch)) depth++
      else if (')]}'.includes(ch)) depth--
      if (ch === sep && depth === 0 && !quote) {
        parts.push(cur)
        cur = ''
      } else cur += ch
    }
    parts.push(cur)
    return parts
  }

  const STRING = /'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g
  const strings = (text: string) => [...text.matchAll(STRING)].map((m) => m[1] ?? m[2] ?? m[3] ?? '')
  const PLAIN = /^\s*('[^'\n]*'|"[^"\n]*"|`[^`$]*`)\s*$/
  const ARRAY = /\[\s*(?:(?:'[^'\n]*'|"[^"\n]*")\s*,\s*)+(?:'[^'\n]*'|"[^"\n]*")\s*,?\s*\]/g

  /** The end of the call whose `(` is at `open`. */
  function close(text: string, open: number) {
    let depth = 0
    for (let j = open; j < text.length; j++) {
      if (text[j] === '(') depth++
      if (text[j] === ')' && --depth === 0) return j
    }
    return text.length
  }

  /** Each element's possible class lists: one per condition tried, as described above. */
  function elements(text: string): string[][] {
    const out: string[][] = []
    let rest = text
    for (let i = rest.search(/(?<![\w$.])cn\(/); i >= 0; i = rest.search(/(?<![\w$.])cn\(/)) {
      const end = close(rest, i + 2)
      const args = split(rest.slice(i + 3, end), ',').filter((a) => a.trim())
      const base = args.filter((a) => PLAIN.test(a)).map((a) => strings(a).join(' '))
      // Keep the order: a condition's classes sit where its argument sits.
      const tried = args.flatMap((arg, n) =>
        PLAIN.test(arg)
          ? []
          : strings(arg).map((alt) =>
              args
                .slice(0, n)
                .filter((a) => PLAIN.test(a))
                .map((a) => strings(a).join(' '))
                .concat(alt, ...args.slice(n + 1).filter((a) => PLAIN.test(a)).map((a) => strings(a).join(' ')))
                .join(' '),
            ),
      )
      out.push([base.join(' '), ...tried])
      rest = rest.slice(0, i) + rest.slice(end + 1)
    }
    for (const m of rest.matchAll(ARRAY)) out.push([strings(m[0]).join(' ')])
    rest = rest.replace(ARRAY, '')
    for (const s of strings(rest)) out.push([s])
    return out
  }

  interface Set1 {
    variants: Set<string>
    name: string | null
  }

  /** `[fg, bg]` for every state of one class list. */
  function pairsIn(classes: string): [fg: string, bg: string][] {
    const bgs: Set1[] = []
    const fgs: Set1[] = []
    const noPointer: Set<string>[] = []
    /** A class with the same variants as an earlier one replaces it. */
    const put = (list: Set1[], s: Set1) => {
      const same = list.findIndex((x) => x.variants.size === s.variants.size && [...x.variants].every((v) => s.variants.has(v)))
      if (same >= 0) list.splice(same, 1)
      list.push(s)
    }
    for (const cls of classes.split(/\s+/).filter(Boolean)) {
      const parts = split(cls, ':')
      const variants = parts.slice(0, -1)
      const utility = parts.at(-1)!.replace(/^!/, '').replace(/\/\d+$/, '')
      if (variants.some((v) => OTHER_ELEMENT.test(v))) continue
      const at = new Set(variants)
      if (utility === 'pointer-events-none') noPointer.push(at)
      if (utility === 'on-ink') {
        put(bgs, { variants: at, name: '--ink' })
        put(fgs, { variants: at, name: '--on-ink' })
      }
      const bg = /^bg-(.+)$/.exec(utility)?.[1]
      if (bg && (RESET.has(bg) || bridged.has(`--${bg}`))) put(bgs, { variants: at, name: RESET.has(bg) ? null : `--${bg}` })
      const fg = /^text-(.+)$/.exec(utility)?.[1]
      if (fg && (RESET.has(fg) || bridged.has(`--${fg}`))) put(fgs, { variants: at, name: RESET.has(fg) ? null : `--${fg}` })
    }
    // The states worth reading: every variant set used, and every two together.
    const keys = [...new Set([...bgs, ...fgs].map((s) => [...s.variants].sort().join(':')))]
    const states = new Set(keys.flatMap((a) => keys.map((b) => [...new Set([...a.split(':'), ...b.split(':')].filter(Boolean))].sort().join(':'))))
    const keyOf = (s: Set1) => [...s.variants].sort().join(':')
    const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])))
    /**
     * The cascade orders possible in `state`. A class with more variants is a
     * more specific selector and wins. Between variant sets of the same size,
     * the winner is decided by Tailwind's variant order, not by the class
     * list, so every order is tried. Within one order, the background and the
     * text both come from the first variant set that sets them, so a tie never
     * pairs the background of one state with the text of another.
     */
    const orders = (state: Set<string>) => {
      const applying = [...new Set([...bgs, ...fgs].filter((s) => [...s.variants].every((v) => state.has(v))).map(keyOf))]
      const sizes = [...new Set(applying.map((k) => (k ? k.split(':').length : 0)))].sort((a, b) => b - a)
      return sizes.reduce<string[][]>(
        (acc, size) => acc.flatMap((head) => permutations(applying.filter((k) => (k ? k.split(':').length : 0) === size)).map((p) => [...head, ...p])),
        [[]],
      )
    }
    const first = (list: Set1[], order: string[]) => {
      for (const key of order) {
        const hit = list.find((s) => keyOf(s) === key)
        if (hit) return hit.name
      }
      return null
    }
    const pointerless = (state: Set<string>) => noPointer.some((v) => [...v].every((x) => state.has(x)))
    const out: [string, string][] = []
    for (const key of states) {
      const state = new Set(key.split(':').filter(Boolean))
      // `has-checked` and `not-has-checked` never hold together.
      if ([...state].some((v) => state.has(`not-${v}`))) continue
      // A state with `pointer-events-none` cannot also be hovered.
      if ([...state].some((v) => /(^|-)hover$/.test(v)) && pointerless(state)) continue
      for (const order of orders(state)) {
        const bg = first(bgs, order)
        const fg = first(fgs, order)
        if (bg && fg && (scoped(bg, 'surface') || scoped(bg, 'overlay')) && scoped(fg, 'text') && !out.some(([f, b]) => f === fg && b === bg)) {
          out.push([fg, bg])
        }
      }
    }
    return out
  }

  /** Measured at text strength (4.5) in both themes: by one pairing, or by two that split the themes. */
  const measured = (fg: string, bg: string) =>
    (['light', 'dark'] as const).every((theme) =>
      PAIRS.some(([f, b, min, themes]) => f === fg && b === bg && min >= 4.5 && (!themes || themes.includes(theme))),
    )

  it('reads one element’s pairings by state, and skips what styles another element', () => {
    const sorted = (pairs: [string, string][]) => pairs.map((p) => p.join(' on ')).sort()
    expect(sorted(pairsIn('bg-cloth-shade hover:bg-cloth-deep text-ink-2 hover:text-ink before:text-ink-muted [&_td]:text-ink-muted'))).toEqual([
      '--ink on --cloth-deep',
      '--ink-2 on --cloth-shade',
    ])
    expect(sorted(pairsIn('bg-cloth-pale data-disabled:bg-cloth-shade data-disabled:text-ink-muted data-disabled:data-checked:bg-cloth-deep text-ink'))).toEqual([
      '--ink on --cloth-pale',
      '--ink-muted on --cloth-deep',
      '--ink-muted on --cloth-shade',
    ])
    expect(sorted(pairsIn('text-ink hover:bg-ink-soft hover:bg-transparent'))).toEqual([])
    expect(pairsIn('on-ink')).toEqual([['--on-ink', '--ink']])
    expect(elements(`cn('bg-cloth-deep', open ? 'text-ink' : 'text-ink-2', 'p-2') + 'text-ink-muted'`)).toEqual([
      ['bg-cloth-deep p-2', 'bg-cloth-deep text-ink p-2', 'bg-cloth-deep text-ink-2 p-2'],
      ['text-ink-muted'],
    ])
  })

  it('measure every text token on every surface the code puts it on', () => {
    const found = new Map<string, Set<string>>()
    for (const file of files) {
      for (const options of elements(source(file))) {
        for (const [fg, bg] of options.flatMap(pairsIn)) {
          const key = `${fg} on ${bg}`
          found.set(key, (found.get(key) ?? new Set()).add(relative(src, file)))
        }
      }
    }
    // A reader that silently found nothing would pass.
    expect(found.size).toBeGreaterThan(20)
    const unmeasured = [...found]
      .filter(([key]) => !measured(...(key.split(' on ') as [string, string])))
      .map(([key, where]) => `${key}: ${[...where].join(', ')}`)
    expect(unmeasured).toEqual([])
  })

  it('give every surface at least one measured text pairing in each theme', () => {
    // The floor under the reader above: a surface can carry text that only an
    // ancestor colours, so every surface must have been measured with text at
    // least once, in both themes.
    const bare = Object.keys(COLOR_SCOPES)
      .filter((bg) => scoped(bg, 'surface'))
      .flatMap((bg) =>
        (['light', 'dark'] as const)
          .filter((theme) => !PAIRS.some(([fg, b, min, themes]) => b === bg && min >= 4.5 && scoped(fg, 'text') && (!themes || themes.includes(theme))))
          .map((theme) => `${bg} (${theme})`),
      )
    expect(bare).toEqual([])
  })
})
