import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Components and patterns are laid out in logical properties — `ps-`/`pe-`,
 * `ms-`/`me-`, `inset-s-`/`inset-e-`, `text-start`/`text-end`, `border-s` —
 * so that `dir="rtl"` mirrors them with no second set of classes. A physical left or
 * right class is correct in one direction and wrong in the other, and nothing
 * else catches it: jsdom does no layout, and axe has no opinion about which
 * side a margin is on.
 *
 * Same spirit as the hex test in tokens/contract.test.ts. A case that really
 * is physical goes in ALLOWED with the reason, so the exception is reviewed
 * rather than slipped in.
 */
const root = resolve(import.meta.dirname, '..')

const ALLOWED: Record<string, { token: string; why: string }[]> = {
  'components/tabs/tabs.tsx': [
    {
      token: 'left-(--active-tab-left)',
      why: "Base UI measures --active-tab-left as a physical offset from the list's left edge, in either direction.",
    },
  ],
  'components/dialog/dialog.tsx': [
    { token: 'left-1/2', why: 'Centring with -translate-x-1/2 is symmetric; a logical inset would need the sign flipped in RTL.' },
  ],
  'components/command/command.tsx': [
    { token: 'left-1/2', why: 'Centring with -translate-x-1/2 is symmetric; a logical inset would need the sign flipped in RTL.' },
  ],
}

// A utility, not a word: the prefix ends in a value Tailwind accepts, so prose
// such as "right-aligned" in a doc comment is not mistaken for a class.
const PHYSICAL_CLASS =
  /(?<![\w-])-?(?:p[lr]|m[lr]|scroll-[mp][lr]|left|right)-(?:\d|\[|\(|px\b|auto\b|full\b)|(?<![\w-])(?:(?:border|rounded)-[lr]|rounded-[tb][lr])(?![\w])|(?<![\w-])(?:text|float|clear)-(?:left|right)\b/g

const PHYSICAL_CSS =
  /\b(?:(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)|text-align:\s*(?:left|right)|float:\s*(?:left|right))\b|(?<![\w-])(?:left|right):/g

// The same, in an inline style object: `style={{ left: '40%' }}`.
const PHYSICAL_STYLE =
  /\b(?:margin|padding|border)(?:Left|Right)\w*\s*:|(?<![\w.-])(?:left|right)\s*:\s*[`'"\d]/g

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(css|tsx?)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('logical properties', () => {
  it('components, patterns and styles use no physical left/right utilities or properties', () => {
    const offenders: string[] = []
    for (const path of ['components', 'patterns', 'styles'].flatMap((dir) => walk(join(root, dir)))) {
      const rel = relative(root, path)
      const source = stripComments(readFileSync(path, 'utf8'))
      const patterns = rel.endsWith('.css') ? [PHYSICAL_CSS] : [PHYSICAL_CLASS, PHYSICAL_STYLE]
      const allowed = (ALLOWED[rel] ?? []).map((entry) => entry.token)
      for (const match of patterns.flatMap((pattern) => [...source.matchAll(pattern)])) {
        const at = match.index
        const token = source.slice(at, source.slice(at).search(/[\s"'`]|$/) + at)
        if (allowed.some((ok) => token.endsWith(ok))) continue
        const line = source.slice(0, at).split('\n').length
        offenders.push(`${rel}:${line} ${token}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('catches what it is meant to catch', () => {
    const hits = (s: string) => [...s.matchAll(PHYSICAL_CLASS)].length
    expect(hits("'pl-3 mr-auto -ml-1 left-0 sm:right-6 text-left border-l-[3px] rounded-tl-none border-r'")).toBe(9)
    expect(hits("'ps-3 me-auto inset-s-0 text-start border-s-[3px] right-aligned translate-x-4'")).toBe(0)
    expect([...'a { margin-left: 0; left: 0; text-align: right }'.matchAll(PHYSICAL_CSS)]).toHaveLength(3)
    expect([...'style={{ left: `40%`, paddingRight: 4, insetInlineStart: 0 }}'.matchAll(PHYSICAL_STYLE)]).toHaveLength(2)
  })
})
