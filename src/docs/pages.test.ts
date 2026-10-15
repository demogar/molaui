import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import preview from '../../.storybook/preview'
import pkg from '../../package.json'
import releasePlease from '../../release-please-config.json'
import { mdxTitles, repoRoot } from '../test/story-index'

/**
 * The contract of the hand-written docs pages: the pages a newcomer's first
 * questions need exist, sit where the sidebar puts them, and Getting started
 * runs in the order a new app is built. Before this, "can I use our colours?"
 * and "what are the breakpoints?" had no page, Getting started put "how to
 * read a component page" between the first component and the theme, and
 * nothing would have noticed either coming back.
 */
const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8')

/** The H2 headings of an MDX page, outside fenced code. */
function headings(mdx: string, level = '## ') {
  return mdx
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .filter((line) => line.startsWith(level))
    .map((line) => line.slice(level.length).trim())
}

type Order = (string | Order)[]
const order = (preview.parameters?.options as { storySort: { order: Order } }).storySort.order

/** The sidebar order's entries under one section, e.g. "Foundations". */
function sidebar(section: string): string[] {
  const at = order.indexOf(section)
  const next = order[at + 1]
  return Array.isArray(next) ? next.filter((e): e is string => typeof e === 'string') : []
}

describe('docs pages', () => {
  it('has a page for each first adoption question', () => {
    for (const title of ['Foundations/Theming', 'Foundations/Responsive', 'Foundations/Data visualisation', 'Mola UI/Migration']) {
      expect(mdxTitles, title).toContain(title)
    }
  })

  it('places every Foundations and Mola UI page in the sidebar order', () => {
    for (const section of ['Foundations', 'Mola UI']) {
      const listed = sidebar(section)
      const pages = mdxTitles
        .filter((t) => t.startsWith(`${section}/`))
        .map((t) => t.slice(section.length + 1).split('/')[0]!)
      expect([...new Set(pages)].filter((p) => !listed.includes(p)), `${section} pages missing from storySort in .storybook/preview.tsx`).toEqual([])
    }
  })
})

describe('Getting started', () => {
  const mdx = read('src/docs/getting-started.mdx')

  it('runs in the order a new app is built', () => {
    expect(headings(mdx)).toEqual([
      'Install',
      'Add the stylesheet',
      'Set up the app root',
      'Use a component',
      'Theme',
      'Density',
      'Right-to-left',
      'React Server Components',
      'Next.js',
      'Connect an AI agent (MCP)',
      'Lint with the design rules (ESLint)',
      'Figma',
      'Read next',
    ])
    expect(headings(mdx, '### ')).toEqual(expect.arrayContaining(['The compiled stylesheet', 'Already on Tailwind v4?', 'Not on React?']))
  })

  it('leaves how to read a component page to the Introduction', () => {
    expect(headings(mdx)).not.toContain('How to read a component page')
    expect(headings(read('src/docs/introduction.mdx'))).toContain('How to read a component page')
  })

  /**
   * The playground installs the package from npm, so it must name the
   * version that is published. release-please bumps it with package.json
   * (extra-files in release-please-config.json), so the release pull request
   * keeps the two equal; this fails if either half is dropped.
   */
  it('links a playground that installs the released version', () => {
    const link = mdx.match(/https:\/\/stackblitz\.com\/github\/demogar\/molaui\/tree\/main\/(examples\/[a-z-]+)\?file=([\w/.-]+)/)
    expect(link, 'Getting started links the playground on StackBlitz').not.toBeNull()
    const [, dir, file] = link!
    expect(existsSync(join(repoRoot, dir!, file!)), `${dir}/${file}`).toBe(true)
    const playground = JSON.parse(read(`${dir}/package.json`)) as { dependencies: Record<string, string>; scripts: Record<string, string> }
    expect(playground.dependencies['@demogar/mola-ui']).toBe(pkg.version)
    expect(playground.scripts.dev).toBeDefined()
    const extra = (releasePlease.packages['.'] as { 'extra-files'?: { path: string; jsonpath: string }[] })['extra-files'] ?? []
    expect(extra).toContainEqual(expect.objectContaining({ path: `${dir}/package.json`, jsonpath: "$.dependencies['@demogar/mola-ui']" }))
  })
})
