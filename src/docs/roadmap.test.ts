import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { repoRoot } from '../test/story-index'

/**
 * The roadmap promises no dates, because a dated roadmap is wrong the day the
 * date passes and nobody edits the page. This holds it to that: no month, no
 * year, no quarter, no "soon". And it has to be findable from where a reader
 * would look for it, or it is a page nobody reads.
 */
const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8')
const roadmap = read('src/docs/roadmap.mdx')

describe('Roadmap', () => {
  it('names no dates', () => {
    const months = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/
    const found = roadmap
      .split('\n')
      .filter((line) => months.test(line) || /\b20\d\d\b/.test(line) || /\bQ[1-4]\b/.test(line) || /\b(soon|next (week|month|quarter|year))\b/i.test(line))
    expect(found).toEqual([])
  })

  it('has the three sections a reader needs, and the way in', () => {
    for (const heading of ['## Planned', '## Under consideration', '## Not planned', '## How an idea gets here']) {
      expect(roadmap).toContain(heading)
    }
    expect(roadmap).toContain('issues/new?template=proposal.yml')
  })

  it('is linked from the README, CONTRIBUTING and Known gaps', () => {
    for (const file of ['README.md', 'CONTRIBUTING.md', 'src/docs/known-gaps.mdx']) {
      expect(read(file), file).toContain('?path=/docs/mola-ui-roadmap--overview')
    }
  })
})
