import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import manifest from '../../../docs/ai/components.json'
import { repoRoot, walk } from '../../test/story-index'
import { builtFrom, componentImports, compositionFiles } from './composition'
import { COMPOSITIONS, usedIn } from './composition-data'
import { PATTERNS } from './patterns'
import { isPattern } from './showcases'

const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8')

describe('componentImports', () => {
  it('keeps value imports from the library, by relative path or the @/ alias', () => {
    const text = [
      "import { Button } from '../../components/button'",
      "import { Callout as Note } from '@/components/callout'",
      "import {\n  Table,\n  type TableProps,\n  TableRow,\n} from '../../components/table'",
      "import type { BadgeTone } from '../../components/badge'",
      "import { RUNS } from '../../components/table/agent-runs.fixture'",
      "import { CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'",
      "import { cn } from '../../lib/cn'",
      "import { Check } from 'lucide-react'",
    ].join('\n')
    expect(componentImports({ path: 'src/patterns/x/x.tsx', text })).toEqual(['Button', 'Callout', 'Table', 'TableRow'])
  })

  it('resolves a sibling import inside the library', () => {
    expect(componentImports({ path: 'src/components/ai/console.stories.tsx', text: "import { ToolCall } from './tool-call'" })).toEqual([
      'ToolCall',
    ])
  })
})

/**
 * The stated composition (docs/ai/composition.json, which the docs pages
 * render) against the imports as they are now. If a pattern starts or stops
 * using a component, this fails until `npm run manifest` is rerun, and the
 * pattern guidance fails until the part is described or its description
 * removed.
 */
describe('composition', () => {
  const pageOf = new Map(manifest.components.flatMap((entry) => entry.exports.map((x) => [x.name, entry.title] as const)))
  const storyFiles = walk(join(repoRoot, 'src'), (name) => name.endsWith('.stories.tsx')).map((path) => path.slice(repoRoot.length + 1))
  const titleOf = (file: string) => read(file).match(/title: '([^']+)'/)?.[1] ?? ''

  it('matches the imports of every pattern and showcase', () => {
    const derived = Object.fromEntries(
      storyFiles
        .filter((file) => COMPOSITIONS[titleOf(file)])
        .map((file) => {
          const title = titleOf(file)
          const kind = isPattern(title) ? 'pattern' : 'showcase'
          const dir = file.split('/').slice(0, -1).join('/')
          const files = compositionFiles(kind, file, readdirSync(join(repoRoot, dir)).map((name) => `${dir}/${name}`))
          const result = builtFrom(files.map((path) => ({ path, text: read(path) })), pageOf)
          expect(result.unknown, `${title} imports names no docs page documents`).toEqual([])
          return [title, { kind, builtFrom: result.titles }]
        }),
    )
    expect(derived).toEqual(COMPOSITIONS)
  })

  it('covers every pattern page', () => {
    const patterns = storyFiles.map(titleOf).filter(isPattern).sort()
    expect(Object.keys(COMPOSITIONS).filter(isPattern).sort()).toEqual(patterns)
  })

  it('describes exactly the parts each pattern imports', () => {
    const drift = Object.entries(PATTERNS).flatMap(([title, pattern]) => {
      const actual = COMPOSITIONS[title]?.builtFrom ?? []
      const stated = Object.keys(pattern.parts)
      return [
        ...actual.filter((part) => !stated.includes(part)).map((part) => `${title}: imports ${part}; describe its job in patterns.ts`),
        ...stated.filter((part) => !actual.includes(part)).map((part) => `${title}: describes ${part}, which it does not import`),
        ...stated.filter((part) => !pattern.parts[part]?.trim()).map((part) => `${title}: ${part} has no description`),
      ]
    })
    expect(drift).toEqual([])
  })

  it('reads the other way round for "Used in"', () => {
    expect(usedIn('Components/Feedback/Empty state')).toContain('Patterns/List and detail')
    expect(usedIn('AI/Prompt input')).toEqual(['AI/Agent console'])
  })
})
