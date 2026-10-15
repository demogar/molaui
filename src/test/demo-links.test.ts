import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from './found'
import { repoRoot, walk } from './story-index'

/**
 * Demo data links to Cayuco, never to a placeholder. The AI fixtures and the
 * agent console showed a source card reading `rollouts.cayuco.internal` while
 * its link went to `example.com/rollouts/...`: hover it, open it, or read the
 * accessibility tree, and the label and the destination disagree. A demo
 * link now uses the host its card shows, under `.cayuco.internal` — a
 * private-use name that never resolves on the public internet, so a click
 * reaches nobody, which was the point of `example.com`. Unit tests may still
 * use example.com; nobody reads them on a page.
 */
const DEMO = (file: string) =>
  /\.stories\.tsx$/.test(file) ||
  file.includes(`${join('src', 'patterns')}`) ||
  file.includes(join('components', 'ai', '_story-data'))

const files = found(
  walk(join(repoRoot, 'src'), (name) => /\.(ts|tsx|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name)).filter(DEMO),
  60,
  'demo data files (stories, patterns, AI fixtures)',
)

describe('demo data links', () => {
  it('never point at a placeholder host', () => {
    const bad = files.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/https?:\/\/(?:www\.)?example\.(?:com|org|net)\b[^\s'")`]*/g)].map(
        (m) => `${relative(repoRoot, f)}: ${m[0]}`,
      ),
    )
    expect(bad).toEqual([])
  })
})
