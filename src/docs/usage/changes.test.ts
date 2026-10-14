import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import preview from '../../../.storybook/preview'
import pkg from '../../../package.json'
import { repoRoot, storyTitles, walk } from '../../test/story-index'
import {
  changesFor,
  COMMIT_PAGES,
  isReleased,
  minorOf,
  NON_COMPONENT_SCOPES,
  pagesFor,
  parseChangelog,
  SCOPE_PAGES,
  unknownScopes,
  unknownSections,
} from './changes'
import { isShowcase } from './showcases'
import { WHATS_NEW, whatsNewTitle } from './whats-new'

const raw = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')
const releases = parseChangelog(raw)
const components = new Set(storyTitles.filter((title) => !isShowcase(title)))

/**
 * A release as release-please writes it, taken from the open 0.4.0 release
 * pull request and given a breaking change, so the parser is tested on a
 * component-scoped entry before the real changelog has one.
 */
const FIXTURE = `# Changelog

## [0.5.0](https://github.com/demogar/molaui/compare/v0.4.0...v0.5.0) (2026-11-02)


### ⚠ BREAKING CHANGES

* **dialog:** rename \`AlertDialog\`'s \`tone\` to \`intent\` ([#40](https://github.com/demogar/molaui/issues/40)) ([1234567](https://github.com/demogar/molaui/commit/1234567aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa))

### Features

* **alert-dialog:** rename \`AlertDialog\`'s \`tone\` to \`intent\` ([#40](https://github.com/demogar/molaui/issues/40)) ([1234567](https://github.com/demogar/molaui/commit/1234567aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa))

## [0.4.0](https://github.com/demogar/molaui/compare/v0.3.0...v0.4.0) (2026-10-13)


### Features

* **callout:** add a flat variant and a swatch colour key ([#20](https://github.com/demogar/molaui/issues/20)) ([fc8a390](https://github.com/demogar/molaui/commit/fc8a390ee8206dcd1d059e30fc90c5c2bd4c2447))
* **docs:** add anatomy diagrams measured from the live component ([#25](https://github.com/demogar/molaui/issues/25)) ([f24a7f0](https://github.com/demogar/molaui/commit/f24a7f0320388cbe669cfdb21c98a82df6223749))


### Bug Fixes

* **theme:** make nested data-theme subtrees re-theme in built css ([#28](https://github.com/demogar/molaui/issues/28)) ([27dcae9](https://github.com/demogar/molaui/commit/27dcae9d6e798e452195bc06e6c3f6dde64c7037))


### Documentation

* **patterns:** add guidance, used-in links and three new patterns ([#26](https://github.com/demogar/molaui/issues/26)) ([fe06943](https://github.com/demogar/molaui/commit/fe06943baaf4c0ca8fe6dd8fa012aa926e7b1731))
* **foundations:** add spacing, layers, content and token pages ([#27](https://github.com/demogar/molaui/issues/27)) ([71a6f2d](https://github.com/demogar/molaui/commit/71a6f2d804675f2e8bb6d7efc4d726205b7d52ba))

## 0.1.0 (2026-10-05)

First public release.

### Features

* **tokens:** two themes in one declaration
`

describe('changelog parser', () => {
  const fixture = parseChangelog(FIXTURE)

  it('reads each release with its version, date and compare link', () => {
    expect(fixture.map((r) => [r.version, r.date])).toEqual([
      ['0.5.0', '2026-11-02'],
      ['0.4.0', '2026-10-13'],
      ['0.1.0', '2026-10-05'],
    ])
    expect(fixture[1]!.compareUrl).toBe('https://github.com/demogar/molaui/compare/v0.3.0...v0.4.0')
  })

  it('attaches a scoped entry to its component, with type, pull request and commit', () => {
    expect(changesFor('Components/Feedback/Callout', fixture)).toEqual([
      {
        version: '0.4.0',
        date: '2026-10-13',
        type: 'feature',
        breaking: false,
        scopes: ['callout'],
        subject: 'add a flat variant and a swatch colour key',
        pr: { number: 20, url: 'https://github.com/demogar/molaui/issues/20' },
        commit: { sha: 'fc8a390', url: 'https://github.com/demogar/molaui/commit/fc8a390ee8206dcd1d059e30fc90c5c2bd4c2447' },
      },
    ])
  })

  it('shows a breaking change once, in its own section, marked breaking, and resolves the alias', () => {
    const dialog = changesFor('Components/Overlays/Dialog', fixture)
    expect(dialog).toHaveLength(1)
    expect(dialog[0]).toMatchObject({ type: 'feature', breaking: true, scopes: ['alert-dialog'], subject: "rename `AlertDialog`'s `tone` to `intent`" })
  })

  it('keeps cross-cutting scopes off component pages', () => {
    const attached = fixture.flatMap((r) => r.entries.filter((e) => e.scopes.some((s) => s in NON_COMPONENT_SCOPES)).flatMap(pagesFor))
    expect(attached).toEqual([])
  })

  it('reads an entry with no links', () => {
    expect(fixture[2]!.entries[0]).toMatchObject({ scopes: ['tokens'], subject: 'two themes in one declaration' })
    expect(fixture[2]!.entries[0]!.commit).toBeUndefined()
  })
})

/**
 * The guard: a scope release-please writes into CHANGELOG.md must be either a
 * component or declared as something else. A new scope fails here instead of
 * silently dropping its entries from every page.
 */
describe('CHANGELOG.md', () => {
  it('has a date for every release', () => {
    expect(releases.length).toBeGreaterThan(0)
    expect(releases.filter((r) => !r.date).map((r) => r.version)).toEqual([])
  })

  it('uses only scopes that map to a component page or are declared as not one', () => {
    expect(unknownScopes(releases)).toEqual([])
    expect(unknownScopes(parseChangelog(FIXTURE))).toEqual([])
  })

  it('uses only section headings the parser knows', () => {
    expect(unknownSections(raw)).toEqual([])
    expect(unknownSections(FIXTURE)).toEqual([])
  })

  // The fixture counts too: it is the open release pull request, so a commit
  // merged since the last release can be attached before it is tagged.
  it('contains every commit COMMIT_PAGES names', () => {
    const shas = new Set(
      [...releases, ...parseChangelog(FIXTURE)].flatMap((r) => r.entries.flatMap((e) => (e.commit ? [e.commit.sha] : []))),
    )
    expect(Object.keys(COMMIT_PAGES).filter((sha) => !shas.has(sha))).toEqual([])
  })
})

describe('scope map', () => {
  it('names only component pages', () => {
    const stray = [...Object.entries(SCOPE_PAGES), ...Object.entries(COMMIT_PAGES)].flatMap(([key, titles]) =>
      titles.filter((title) => !components.has(title)).map((title) => `${key} -> ${title}`),
    )
    expect(stray).toEqual([])
  })

  it('reaches every component page, so a new component cannot be left without its changes', () => {
    const reached = new Set(Object.values(SCOPE_PAGES).flat())
    expect([...components].filter((title) => !reached.has(title))).toEqual([])
  })

  it('never declares a scope as both a component and not one', () => {
    expect(Object.keys(SCOPE_PAGES).filter((scope) => scope in NON_COMPONENT_SCOPES)).toEqual([])
  })
})

describe("What's new", () => {
  const pages = walk(join(repoRoot, 'src/docs/whats-new'), (name) => name.endsWith('.mdx')).map((path) => {
    const text = readFileSync(path, 'utf8')
    return {
      path,
      title: text.match(/<Meta\s+title="([^"]+)"/)?.[1],
      versions: [...text.matchAll(/version="([^"]+)"/g)].map((m) => m[1]),
    }
  })

  it('has one page per listed version, titled and wired to that version', () => {
    expect(pages.map((p) => p.title).sort()).toEqual(WHATS_NEW.map(whatsNewTitle).sort())
    for (const page of pages) {
      const version = WHATS_NEW.find((v) => whatsNewTitle(v) === page.title)!
      expect(new Set(page.versions), page.path).toEqual(new Set([version]))
    }
  })

  it('is listed in the sidebar newest first', () => {
    const order = preview.parameters?.options?.storySort?.order as unknown[]
    const mola = order[order.indexOf('Mola UI') + 1] as unknown[]
    const listed = mola[mola.indexOf("What's new") + 1]
    expect(listed).toEqual(WHATS_NEW.map(minorOf))
  })

  it('has a changelog entry for every release package.json has reached', () => {
    const missing = WHATS_NEW.filter((v) => isReleased(v, pkg.version) && !releases.some((r) => r.version === v))
    expect(missing).toEqual([])
  })

  it('has a page for every minor release in CHANGELOG.md', () => {
    // 0.1.0 is the first release: there was nothing before it to be new against.
    const minors = [...new Set(releases.map((r) => minorOf(r.version)))].filter((m) => m !== '0.1')
    const missing = minors.filter((m) => !WHATS_NEW.some((v) => minorOf(v) === m))
    expect(missing, 'Write src/docs/whats-new/<minor>.mdx and list it in WHATS_NEW').toEqual([])
  })

  it('reads released from the version, so a draft flips when the release lands', () => {
    expect(isReleased('0.4.0', '0.3.0')).toBe(false)
    expect(isReleased('0.4.0', '0.4.0')).toBe(true)
    expect(isReleased('0.4.0', '0.10.0')).toBe(true)
    expect(isReleased('1.0.0', '0.12.3')).toBe(false)
  })
})
