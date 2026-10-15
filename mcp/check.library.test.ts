// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../src/test/found'
import { checkCode, contextFrom, type Finding } from './check'
import { ALLOWED, BUILDING_BLOCK, files, isShippedComponent, root, unexcused, walk, type Allowed } from './check.allowed'
import { loadData } from './data'

/**
 * check_code run over the library's own source: every shipped file in
 * src/components and src/patterns, every story, every docs block and every
 * MDX page. The library is reviewed against the same rules as an agent's
 * code, and stories most of all, because stories are what people and agents
 * copy. A finding here is either a false positive (fix the check) or a real
 * break (fix the source). Either way the two cannot disagree silently.
 *
 * What is allowed, and why, is in mcp/check.allowed.ts, shared with the ESLint
 * plugin's run over the same files (eslint/plugin.test.ts).
 */
const ctx = contextFrom(loadData(root))

const used = new Set<Allowed>()
function findings(rel: string): Finding[] {
  return unexcused(rel, checkCode(readFileSync(join(root, rel), 'utf8'), ctx, { filename: rel }), used)
}

describe('check_code on the library itself', () => {
  it('covers shipped source, every story, docs blocks and MDX', () => {
    expect(files.filter(isShippedComponent).length).toBeGreaterThan(100)
    const everywhere = found(walk(join(root, 'src')), 200, 'sources under src/').map((path) => relative(root, path))
    expect(files.filter((f) => f.endsWith('.stories.tsx'))).toEqual(everywhere.filter((f) => f.endsWith('.stories.tsx')))
    expect(files.filter((f) => f.endsWith('.mdx'))).toEqual(everywhere.filter((f) => f.endsWith('.mdx')))
    expect(files.filter((f) => f.endsWith('.stories.tsx')).length).toBeGreaterThan(70)
    expect(files.some((f) => f.startsWith('src/patterns/') && f.endsWith('.stories.tsx'))).toBe(true)
    expect(files.some((f) => f.startsWith('src/docs/blocks/'))).toBe(true)
  })

  it('reads the source rather than passing it over: the components do what only a component may', () => {
    const baseUi = files.filter(isShippedComponent).flatMap((rel) => checkCode(readFileSync(join(root, rel), 'utf8'), ctx, { filename: rel }).filter((f) => f.rule === 12 && BUILDING_BLOCK.test(f.message)))
    expect(baseUi.length).toBeGreaterThan(20)
  })

  it('finds nothing that is not allowed, with a reason, file by file', () => {
    const found = files.flatMap((rel) => findings(rel).map((f) => `${rel}:${f.line} rule ${f.rule} ${f.severity}: ${f.message}`))
    expect(found).toEqual([])
  })

  it('has no stale allowance: each entry still excuses a finding', () => {
    for (const rel of files) findings(rel)
    const stale = Object.entries(ALLOWED).flatMap(([rel, entries]) => entries.filter((a) => !used.has(a)).map((a) => `${rel} rule ${a.rule} ${a.match}`))
    expect(stale).toEqual([])
    for (const entries of Object.values(ALLOWED)) for (const a of entries) expect(a.why.split(/\s+/).length).toBeGreaterThan(8)
  })
})
