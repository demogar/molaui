// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { checkCode, contextFrom } from './check'
import { loadData } from './data'

/**
 * The checker run over the library's own source: every non-story, non-test
 * file in src/components and src/patterns. The library is reviewed against
 * the same rules, so a finding here is either a false positive in the checker
 * (fix the check) or a real break in the source (fix the source). Either way
 * the two cannot disagree silently.
 *
 * Two allowances, both reasoned:
 *
 * - Rule 12 ("use the components for behaviour") is not applied to
 *   src/components. That is where the components are built: button.tsx has
 *   to write `<button>` and import Base UI. Patterns are consumers and get
 *   every rule.
 * - ALLOWED: the same physical offsets src/test/logical-properties.test.ts
 *   allows, for the same reasons.
 */
const root = resolve(import.meta.dirname, '..')
const ctx = contextFrom(loadData(root))

const ALLOWED: Record<string, { rule: number; excerpt: RegExp; why: string }[]> = {
  'src/components/tabs/tabs.tsx': [
    { rule: 7, excerpt: /left-\(--active-tab-left\)/, why: "Base UI measures --active-tab-left as a physical offset from the list's left edge, in either direction." },
  ],
  // The hand-styled-button suggestion is a warning because sometimes the
  // native element is right. These two are those times.
  'src/patterns/filtered-table/filtered-table.tsx': [
    { rule: 12, excerpt: /^<button$/, why: 'The run id in a table cell, styled as an underlined literal that opens the drawer: a Button would put a control in every row.' },
  ],
  'src/patterns/list-and-detail/list-and-detail.tsx': [
    { rule: 12, excerpt: /^<button$/, why: 'A whole list row that selects the record, with aria-current: a row, not a Button, and Mola has no list-row component.' },
  ],
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(name) && !/\.(?:test|stories)\.tsx?$/.test(name) ? [path] : []
  })
}

describe('check_code on the library itself', () => {
  const files = ['src/components', 'src/patterns'].flatMap((dir) => walk(join(root, dir)))

  it('finds the files', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('reads the source rather than passing it over: the components do what only a component may', () => {
    // Every Base UI import in src/components is a rule 12 finding the test below sets aside.
    const baseUi = files
      .filter((path) => relative(root, path).startsWith('src/components/'))
      .flatMap((path) => checkCode(readFileSync(path, 'utf8'), ctx, { filename: path }))
      .filter((f) => f.rule === 12 && f.message.includes('@base-ui/react'))
    expect(baseUi.length).toBeGreaterThan(20)
  })

  it('finds nothing in src/components or src/patterns', () => {
    const findings = files.flatMap((path) => {
      const rel = relative(root, path)
      const component = rel.startsWith('src/components/')
      return checkCode(readFileSync(path, 'utf8'), ctx, { filename: rel })
        .filter((f) => !(component && f.rule === 12))
        .filter((f) => !(ALLOWED[rel] ?? []).some((a) => a.rule === f.rule && a.excerpt.test(f.excerpt)))
        .map((f) => `${rel}:${f.line} rule ${f.rule} ${f.severity}: ${f.message}`)
    })
    expect(findings).toEqual([])
  })
})
