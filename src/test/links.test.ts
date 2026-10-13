import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import config from '../../.storybook/main'
import pkg from '../../package.json'
import { docsId } from '../docs/usage/links'
import { knownIds, mdxTitles, repoRoot, storyTitles, walk } from './story-index'

/**
 * Every link into Storybook (`?path=/docs/<id>` or `?path=/story/<id>`) has to
 * land on a page that exists. Story ids are derived from titles and export
 * names, so renaming a story or moving it to another section silently breaks
 * every link to it — in the README, the MDX pages, usage guidance, llms.txt
 * and the agent manifest — and nothing else would notice.
 */
const SOURCES = [
  'README.md',
  'CONTRIBUTING.md',
  'llms.txt',
  'llms-full.txt',
  'llms-components.txt',
  'llms-tokens.txt',
  'llms-patterns.txt',
  'docs/ai/components.json',
  ...walk(join(repoRoot, 'docs/ai/md'), (name) => name.endsWith('.md')).map((path) => relative(repoRoot, path)),
  ...walk(join(repoRoot, 'src'), (name) => /\.(mdx|tsx?)$/.test(name)).map((path) => relative(repoRoot, path)),
  ...walk(join(repoRoot, 'skills'), (name) => name.endsWith('.md')).map((path) => relative(repoRoot, path)),
  ...walk(join(repoRoot, 'codemods'), (name) => name.endsWith('.md')).map((path) => relative(repoRoot, path)),
]

const LINK = /path=\/(?:docs|story)\/([a-z0-9-]+)/g

describe('links into Storybook', () => {
  it('every link resolves to a docs page or a story', () => {
    const broken: string[] = []
    for (const file of SOURCES) {
      const text = readFileSync(join(repoRoot, file), 'utf8')
      for (const match of text.matchAll(LINK)) {
        if (!knownIds.has(match[1]!)) broken.push(`${file}: ${match[1]}`)
      }
    }
    expect([...new Set(broken)]).toEqual([])
  })

  it('knows the ids Storybook assigns', () => {
    for (const id of ['mola-ui-introduction--overview', 'components-feedback-callout--overview', 'ai-agent-console--console']) {
      expect(knownIds).toContain(id)
    }
  })
})

/**
 * The agent docs link to files the site serves beside the pages: the llms*.txt
 * files and the Markdown twin of each docs page (`md/<page id>.md`). Those
 * are copied in by Storybook's staticDirs, so a link to one is broken if the
 * file is missing from the repository or staticDirs does not serve it.
 */
const SITE = pkg.homepage.replace(/\/?$/, '/')
const staticDirs = Array.isArray(config.staticDirs) ? config.staticDirs : []
const served = staticDirs.flatMap((dir) =>
  typeof dir === 'string' ? [] : [{ to: dir.to.replace(/^\//, ''), from: dir.from.replace(/^\.\.\//, '') }],
)

/** The repository file a site path is served from, or null when nothing serves it. */
function sourceOf(path: string) {
  for (const { to, from } of served) {
    if (path === to) return from
    if (path.startsWith(`${to}/`)) return `${from}/${path.slice(to.length + 1)}`
  }
  return null
}

describe('links to files the site serves', () => {
  it('every link to an llms file or a Markdown twin resolves to a served file', () => {
    const pattern = new RegExp(`${SITE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}((?:llms[a-z-]*\\.txt)|(?:md/[a-z0-9-]+\\.md))`, 'g')
    const broken: string[] = []
    let seen = 0
    for (const file of SOURCES) {
      const text = readFileSync(join(repoRoot, file), 'utf8')
      for (const match of text.matchAll(pattern)) {
        seen++
        const from = sourceOf(match[1]!)
        if (!from || !existsSync(join(repoRoot, from))) broken.push(`${file}: ${match[1]}`)
      }
    }
    expect(seen).toBeGreaterThan(100)
    expect([...new Set(broken)]).toEqual([])
  })
})

describe('Markdown twins', () => {
  const ids = [...new Set([...storyTitles, ...mdxTitles].map(docsId))].sort()
  const twins = readdirSync(join(repoRoot, 'docs/ai/md')).filter((name) => name.endsWith('.md'))

  it('exist for every docs page id, and for nothing else', () => {
    expect(twins.map((name) => name.replace(/\.md$/, '')).sort()).toEqual(ids)
  })

  it('are served at md/<id>.md', () => {
    expect(sourceOf('md/components-actions-button--overview.md')).toBe('docs/ai/md/components-actions-button--overview.md')
  })
})
