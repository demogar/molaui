import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { knownIds, repoRoot, walk } from './story-index'

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
  'docs/ai/components.json',
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
