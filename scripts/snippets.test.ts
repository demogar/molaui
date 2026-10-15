import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import manifest from '../docs/ai/components.json'
import pkg from '../package.json'
import { PACKAGE, type Snippet, SNIPPETS_FILE, snippets } from './snippets'

const root = resolve(import.meta.dirname, '..')

const page = (source: string, required: Record<string, { name: string; type: string }[]> = { Thing: [] }) => ({
  title: 'Components/Test/Thing',
  source,
  summary: 'A thing.',
  required,
})

const header = `import type { Meta } from '@storybook/react-vite'
import { fixture } from './fixtures'
import { Thing, Other } from './thing'
const meta = { title: 'Components/Test/Thing', component: Thing, args: { label: 'Run name', onChange: fn() } } satisfies Meta<typeof Thing>
export default meta
`

describe('snippets()', () => {
  it('takes the first story whose root is the page component, with args written out and words as tab stops', () => {
    const out = snippets([page(`${header}
export const Gallery = { render: () => <div className="flex"><Thing label="One" /></div> }
export const Default = { render: (args) => <Thing {...args} tone="info">Hello there</Thing> }
`)], new Set(['Thing', 'Other']))
    expect(out.Thing!.prefix).toBe('mola-thing')
    expect(out.Thing!.body).toEqual(['<Thing label="${1:Run name}" tone="info">${2:Hello there}</Thing>$0'])
    expect(out.Thing!.description).toBe(`A thing. import { Thing } from '${PACKAGE}'`)
  })

  it('skips a story that uses a fixture, a local helper that shadows an export, or hooks', () => {
    const source = `${header.replace(', component: Thing', '')}
function Stack() { return null }
export const Fixture = { render: () => <Thing items={fixture} /> }
export const Helper = { render: () => <Stack /> }
export const Hooks = { render: () => { const [a] = useState(1); return <Thing label={a} /> } }
export const Plain = { render: () => <Thing label="Run name" /> }
`
    const out = snippets([page(source)], new Set(['Thing', 'Other', 'Stack']))
    expect(out.Thing!.body).toEqual(['<Thing label="${1:Run name}" />$0'])
  })

  it('builds from the manifest when no story qualifies at all', () => {
    const source = header.replace(", component: Thing", '') + `export const Fixture = { render: () => <Thing items={fixture}>x</Thing> }\n`
    const out = snippets([page(source, { Thing: [{ name: 'items', type: 'Item[]' }, { name: 'label', type: 'string' }] })], new Set(['Thing']))
    expect(out.Thing!.body).toEqual(['<Thing items={${1:items}} label="${2:label}">$0</Thing>'])
  })

  it('escapes the snippet syntax in literal text', () => {
    const out = snippets([page(`${header}
export const Cost = { render: () => <Thing label="Cost">$0.51 {'\\\\n'}</Thing> }
`)], new Set(['Thing']))
    expect(out.Thing!.body.join('\n')).toBe(`<Thing label="\${1:Cost}">\\$0.51 {'\\\\\\\\n'}</Thing>$0`)
  })
})

/** The snippet as the code it inserts: each placeholder replaced by its default, escapes undone. */
function expand(snippet: Snippet) {
  return snippet.body
    .join('\n')
    .replace(/\$0/g, '')
    .replace(/\$\{\d+:((?:\\.|[^}\\])*)\}/g, '$1')
    .replace(/\\([\\$}])/g, '$1')
}

describe(SNIPPETS_FILE, () => {
  const text = readFileSync(resolve(root, SNIPPETS_FILE), 'utf8')
  const file = JSON.parse(text.replace(/^\/\/.*$/gm, '')) as Record<string, Snippet>
  const titles = manifest.components.map((c) => c.title)

  it('has one snippet for every component page', () => {
    expect(Object.keys(file).sort()).toEqual(titles.map((t) => t.split('/').at(-1)).sort())
    expect(titles.length).toBeGreaterThan(50)
  })

  it('inserts code that parses and uses only the names its description imports', () => {
    const problems: string[] = []
    for (const [name, snippet] of Object.entries(file)) {
      const code = expand(snippet)
      const imports = [...snippet.description.matchAll(/import \{ ([^}]+) \} from '([^']+)'/g)].flatMap((m) => m[1]!.split(', '))
      const program = `${[...snippet.description.matchAll(/import \{[^}]+\} from '[^']+'/g)].map((m) => m[0]).join('\n')}\nexport const _ = (\n${code}\n)\n`
      const sf = ts.createSourceFile('s.tsx', program, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const errors = (sf as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics
      if (errors.length) problems.push(`${name}: does not parse (${ts.flattenDiagnosticMessageText(errors[0]!.messageText, ' ')})`)
      for (const tag of code.matchAll(/<([A-Z]\w*)/g)) if (!imports.includes(tag[1]!)) problems.push(`${name}: uses ${tag[1]} without importing it`)
    }
    expect(problems).toEqual([])
  })

  it('ships in the package', () => {
    expect(pkg.files).toContain(SNIPPETS_FILE.split('/')[0])
  })
})
