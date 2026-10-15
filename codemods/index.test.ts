import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import pkg from '../package.json'
import { found } from '../src/test/found'
import { walk } from '../src/test/story-index'

/**
 * The codemod index (src/docs/codemods.mdx) is a hand-written table, because
 * Storybook cannot import a codemod (it loads the TypeScript compiler and
 * node:fs). So this test is what keeps it true: every codemod in this folder
 * has a row, a test beside it, and versions that agree with its own `meta`
 * and with the `deprecate()` warning it migrates; and every live deprecation
 * in the library is accounted for, by a codemod or by a line saying why
 * there is none.
 */
const here = import.meta.dirname
const root = resolve(here, '..')
const page = readFileSync(join(root, 'src/docs/codemods.mdx'), 'utf8')
const BLOB = 'https://github.com/demogar/molaui/blob/main/codemods/'

const codemods = found(
  readdirSync(here).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')),
  1,
  'codemods',
)

/** Import a codemod by file name; the name is only known at run time, so Vite is told not to resolve it. */
const load = (file: string) => import(/* @vite-ignore */ pathToFileURL(join(here, file)).href) as Promise<unknown>

interface Meta {
  change: string
  /** The `deprecate()` ids it migrates, as written in the source (a template id such as `chip-size-${size}` included). */
  deprecations: string[]
  deprecated: string
  removed: string
}

const semver = (v: string) => v.split('.').map(Number) as [number, number, number]
const compare = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

/**
 * The release a codemod's deprecation may name: one already out, or the next
 * minor, which is the release the deprecating pull request is waiting for
 * (release-please bumps the version only when that release is cut).
 */
const [major, minor] = semver(pkg.version)
const nextMinor = `${major}.${minor + 1}.0`

/** Every `deprecate('<id>', { … removal: '<version>' … })` in the library source, with a template-literal id kept as written. */
const deprecations = new Map<string, string>()
for (const file of walk(join(root, 'src'), (name) => /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name))) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(/deprecate\((['`])([^'`]+)\1,[\s\S]{0,400}?removal:\s*'([^']+)'/g)) deprecations.set(m[2]!, m[3]!)
}

describe('codemod index', () => {
  it.each(codemods)('%s has a test, a record and a row that agree', async (file) => {
    const name = file.replace(/\.ts$/, '')
    expect(existsSync(join(here, `${name}.test.ts`)), `${name}.test.ts is missing`).toBe(true)
    const { meta } = (await load(file)) as { meta?: Meta }
    expect(meta, `${file} must export meta { change, deprecations, deprecated, removed }`).toBeDefined()
    const { change, deprecations: ids, deprecated, removed } = meta!
    expect(deprecated).toMatch(/^\d+\.\d+\.\d+$/)
    expect(removed).toMatch(/^\d+\.\d+\.\d+$/)
    expect(compare(deprecated, nextMinor), `deprecated after the next release (${nextMinor})`).toBeLessThanOrEqual(0)
    expect(compare(removed, deprecated), 'removed before it was deprecated').toBeGreaterThan(0)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(deprecations.get(id), `no deprecate('${id}', { removal: '${removed}' }) in src/`).toBe(removed)
    const row = `| [\`${file}\`](${BLOB}${file}) | ${change} | ${deprecated} | ${removed} | [\`${name}.test.ts\`](${BLOB}${name}.test.ts) |`
    expect(page.split('\n'), `src/docs/codemods.mdx needs the row:\n${row}`).toContain(row)
  })

  it('lists no codemod that does not exist', () => {
    const listed = [...page.matchAll(/^\| \[`([^`]+\.ts)`\]/gm)].map((m) => m[1])
    expect(listed.filter((file) => !codemods.includes(file!))).toEqual([])
  })

  it('accounts for every deprecation in the library', async () => {
    const migrated = new Set<string>()
    for (const file of codemods) for (const id of ((await load(file)) as { meta: Meta }).meta.deprecations) migrated.add(id)
    const without = page.slice(page.indexOf('## Deprecations without a codemod'), page.indexOf('## How this page stays complete'))
    const missing = [...deprecations.keys()].filter((id) => !migrated.has(id) && !without.includes(`\`${id}\``))
    expect(missing, 'add a codemod, or a line under "Deprecations without a codemod" in src/docs/codemods.mdx').toEqual([])
    expect(deprecations.size).toBeGreaterThan(0)
  })

  it('is linked from the codemods README and the Versioning page', () => {
    const link = '?path=/docs/mola-ui-codemods--overview'
    expect(readFileSync(join(here, 'README.md'), 'utf8')).toContain(link)
    expect(readFileSync(join(root, 'src/docs/versioning.mdx'), 'utf8')).toContain(link)
  })
})
