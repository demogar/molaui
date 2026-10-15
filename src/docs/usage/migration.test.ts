import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { repoRoot } from '../../test/story-index'
import { parseChangelog } from './changes'
import { migrationSections, missingMigrations } from './migration'

const page = readFileSync(join(repoRoot, 'src/docs/migration.mdx'), 'utf8')
const releases = parseChangelog(readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8'))

const entry = (n: number, sha: string, subject: string) =>
  `* ${subject} ([#${n}](https://github.com/demogar/molaui/issues/${n})) ([${sha}](https://github.com/demogar/molaui/commit/${sha}aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa))`

/**
 * 0.7.0 as release-please will write it from the breaking pull requests
 * merged since 0.6.0. The real CHANGELOG.md has no breaking release yet, so
 * without this the check below would pass on an empty page; with it, the
 * guide for the release now on main is held to its pull requests today.
 */
const NEXT = `# Changelog

## [0.7.0](https://github.com/demogar/molaui/compare/v0.6.0...v0.7.0) (2026-10-20)


### ⚠ BREAKING CHANGES

${entry(146, 'c493d04', 'one prop vocabulary, open prop bags, router links and one controllable hook')}
${entry(128, '2dd0060', 'close small api and token defects (toast timeout, sparkline, keys, variant nulls, forced colours, browser floor)')}
${entry(122, '9f36126', 'close the wave-0 p1 defects (release gate, check:all, focus ring, overlay keys, prop merging)')}
${entry(123, 'a170ddc', "**tokens:** close tailwind's default namespaces and make the dtcg export valid")}
${entry(121, '61db69f', '**package:** take base ui as a peer dependency, resolve require() and regenerate the api report on dependabot bumps')}

### Bug Fixes

${entry(131, '0f0e5a3', "**table:** stop the bulk bar clipping its actions' cut and focus ring")}
`

describe('Migration page', () => {
  it('has a section, with every breaking pull request linked, for each breaking release in CHANGELOG.md', () => {
    expect(missingMigrations(releases, page), 'Add a section to src/docs/migration.mdx: see migration.ts').toEqual([])
  })

  it('already covers 0.7.0, the breaking release on main', () => {
    expect(missingMigrations(parseChangelog(NEXT), page)).toEqual([])
  })

  it('reports a release with no section, and a breaking pull request left out of one', () => {
    const next = parseChangelog(NEXT)
    expect(missingMigrations(next, '')).toEqual([{ version: '0.7.0', section: true, prs: [146, 128, 122, 123, 121] }])
    const partial = '<ReleaseStatus version="0.7.0" />\n[pull request 121](https://github.com/demogar/molaui/pull/121)'
    expect(missingMigrations(next, partial)).toEqual([{ version: '0.7.0', section: false, prs: [146, 128, 122, 123] }])
  })

  it('splits the page at each release', () => {
    const sections = migrationSections('<ReleaseStatus version="0.8.0" />\neight\n<ReleaseStatus version="0.7.0" />\nseven')
    expect([...sections.keys()]).toEqual(['0.8.0', '0.7.0'])
    expect(sections.get('0.8.0')).not.toContain('seven')
  })
})
