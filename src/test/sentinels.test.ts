import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found, foundModules } from './found'

/**
 * The gate for #100: a test that enumerates files must say how many it expects
 * to find, so a glob that stops matching fails instead of passing vacuously.
 *
 * It reads every test file (unit, visual and behaviour) and the helpers in
 * src/test/ as text. One that calls a filesystem enumerator, or Vite's
 * `import.meta.glob`, must also call `found()` or `foundModules()`. The rule is
 * per file, not per call: a file that walks a list it got from a sentinelled
 * glob (composition.test.ts reads each pattern's own folder) is covered by
 * that sentinel, and holding every call would need a parser to tell a walk's
 * recursive call from a new walk. A file whose enumeration genuinely has no
 * minimum goes in EXEMPT with the reason.
 */
const root = resolve(import.meta.dirname, '../..')

const ENUMERATES = /import\.meta\.glob\s*[<(]|\b(?:globSync|glob|readdirSync|readdir|opendirSync|opendir)\(/
const SENTINEL = /\bfound(?:Modules)?\s*\(/

/** Files allowed to enumerate without a sentinel, each with why. Empty today. */
const EXEMPT: Record<string, string> = {}

const isTestFile = (rel: string) =>
  /\.(?:test|visual|behaviour)\.tsx?$/.test(rel) || (/^src\/test\/[^/]+\.tsx?$/.test(rel) && !rel.endsWith('found.ts'))

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.') || name === '__screenshots__' || name === 'consumers') return []
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

const testFiles = found(
  ['src', 'scripts', 'mcp', 'codemods', 'test'].flatMap((dir) => walk(join(root, dir))).map((path) => relative(root, path)).filter(isTestFile),
  50,
  'test files',
)

describe('glob-driven tests have sentinels', () => {
  const enumerating = testFiles.filter((rel) => ENUMERATES.test(readFileSync(join(root, rel), 'utf8')))

  it('finds the tests that enumerate files', () => {
    // The sentinel's own sentinel: if the pattern above stopped matching,
    // every file would look compliant.
    expect(enumerating.length).toBeGreaterThan(15)
  })

  it('every test that enumerates files asserts a minimum count', () => {
    const missing = enumerating.filter((rel) => !EXEMPT[rel] && !SENTINEL.test(readFileSync(join(root, rel), 'utf8')))
    expect(missing, 'call found(list, min, what) from src/test/found.ts on what the glob or walk returns').toEqual([])
  })

  it('exempts only files that still enumerate', () => {
    expect(Object.keys(EXEMPT).filter((rel) => !enumerating.includes(rel))).toEqual([])
  })
})

describe('found()', () => {
  it('returns the list when it is long enough', () => {
    expect(found(['a', 'b'], 2, 'letters')).toEqual(['a', 'b'])
    expect(foundModules({ a: 1 }, 1, 'modules')).toEqual({ a: 1 })
  })

  it('throws on an empty or short list, naming what it looked for', () => {
    expect(() => found([], 1, 'stories files')).toThrow(/stories files: expected at least 1, found 0/)
    expect(() => found(['a'], 2, 'letters')).toThrow(/found 1/)
    expect(() => foundModules({}, 1, 'stories files')).toThrow(/found 0/)
  })

  it('refuses a minimum that accepts nothing', () => {
    expect(() => found([], 0, 'anything')).toThrow(/below 1/)
  })
})
