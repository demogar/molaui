// @vitest-environment node
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import pkg from '../package.json'
import { findRoot, loadData } from './data'
import { createServer } from './server'

/**
 * The server in-process, through the SDK's own client over a linked pair of
 * in-memory transports: the same protocol a client speaks over stdio, without
 * a child process. The bundled bin is exercised over real stdio, from the
 * packed tarball, by scripts/consumers.mjs.
 */
const data = loadData()
const client = new Client({ name: 'mola-ui-test', version: '0.0.0' })

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await Promise.all([createServer(data).connect(serverSide), client.connect(clientSide)])
})

afterAll(async () => {
  await client.close()
})

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as { content: { type: string; text: string }[]; isError?: boolean }
  return { text: result.content.map((c) => c.text).join('\n'), isError: Boolean(result.isError) }
}

describe('mola-ui MCP server', () => {
  it('reads the generated docs from the package root', () => {
    expect(findRoot()).toMatch(/\/[^/]+$/)
    expect(data.version).toBe(pkg.version)
    expect(data.manifest.components.length).toBeGreaterThan(50)
    expect(data.tokens.tokens.length).toBeGreaterThan(50)
  })

  it('introduces itself with its version and instructions', () => {
    expect(client.getServerVersion()).toMatchObject({ name: 'mola-ui', version: pkg.version })
    expect(client.getInstructions()).toMatch(/get_rules/)
  })

  it('offers seven read-only tools', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['check_code', 'get_component', 'get_pattern', 'get_rules', 'get_tokens', 'list_components', 'search'])
    for (const tool of tools) expect(tool.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false })
  })

  it('list_components lists every page, and filters by layer', async () => {
    const all = await call('list_components')
    for (const c of data.manifest.components) expect(all.text).toContain(`**${c.name}**`)
    const ai = await call('list_components', { layer: 'ai' })
    expect(ai.text).toContain('**Tool call**')
    expect(ai.text).not.toContain('**Button**')
  })

  it('list_components states the same counts as the README and llms.txt', async () => {
    const { counts, components } = data.manifest
    const core = components.filter((c) => c.layer === 'components').length
    const ai = components.filter((c) => c.layer === 'ai').length
    expect(counts).toMatchObject({ components: core, aiComponents: ai, pages: core + ai })
    expect(counts.summary).toBe(`${core} components and ${ai} AI components (${core + ai} documented pages)`)
    const heading = async (args: Record<string, unknown> = {}) => (await call('list_components', args)).text.split('\n')[0]
    const tail = ` in ${data.manifest.name} ${data.version}`
    expect(await heading()).toBe(`# ${counts.summary}${tail}`)
    expect(await heading({ layer: 'components' })).toBe(`# ${core} components${tail}`)
    expect(await heading({ layer: 'ai' })).toBe(`# ${ai} AI components${tail}`)
  })

  it('get_component returns props, usage, accessibility, anatomy, used in and examples', async () => {
    const { text, isError } = await call('get_component', { name: 'Field' })
    expect(isError).toBe(false)
    for (const heading of ['## Usage', '### When not to', '## Anatomy', '## API', '## Accessibility', '## Used in', '## Examples']) {
      expect(text).toContain(heading)
    }
    expect(text).toContain("import { Label, Field, Input, Textarea, SearchInput } from '@demogar/mola-ui'")
    expect(text).toContain('| `label` (required) |')
    expect(text).toContain('md/components-forms-field--overview.md')
  })

  it('get_component lists a component’s changes from the changelog', async () => {
    const changed = data.manifest.components.find((c) => c.changes?.length)!
    const { text } = await call('get_component', { name: changed.name })
    expect(text).toContain('## Changes')
    expect(text).toContain(changed.changes![0]!.subject)
  })

  it('get_component with brief returns the summary, usage, props and what you handle, at a fraction of the size', async () => {
    const full = await call('get_component', { name: 'Field' })
    const brief = await call('get_component', { name: 'Field', brief: true })
    expect(brief.isError).toBe(false)
    expect(brief.text).toMatch(/^# Field \(brief\)/)
    for (const heading of ['## When to use', '## When not to', '## Props', '## You handle']) expect(brief.text).toContain(heading)
    for (const heading of ['## Anatomy', '## Accessibility', '## Examples', '## Changes', '### Do and don’t']) expect(brief.text).not.toContain(heading)
    expect(brief.text).toContain("import { Label, Field, Input, Textarea, SearchInput } from '@demogar/mola-ui'")
    expect(brief.text).toMatch(/^- `Field`: `label: ReactNode`, /m)
    expect(brief.text).toContain('`optional?: boolean = false`')
    expect(brief.text).toContain('Call get_component with brief false for the whole page')
    expect(brief.text.length).toBeLessThan(full.text.length / 2)
    // Across every page, not only the one above.
    const sizes = await Promise.all(
      data.manifest.components.map(async (c) => [(await call('get_component', { name: c.name, brief: true })).text.length, (await call('get_component', { name: c.name })).text.length]),
    )
    expect(sizes.reduce((a, [b]) => a + b!, 0) / sizes.reduce((a, [, f]) => a + f!, 0)).toBeLessThan(0.4)
    expect((await call('get_component', { name: 'IconButton', brief: true })).text).toMatch(/^# Button \(brief\)\n\n`IconButton` is documented on this page/)
  })

  it('get_component finds a page by a loose name or by an export', async () => {
    expect((await call('get_component', { name: 'date-picker' })).text).toMatch(/^# Date picker/)
    const byExport = await call('get_component', { name: 'IconButton' })
    expect(byExport.text).toMatch(/^# Button\n\n`IconButton` is documented on this page/)
  })

  it('get_component says what it could not find, with close matches', async () => {
    const { text, isError } = await call('get_component', { name: 'Buton' })
    expect(isError).toBe(true)
    expect(text).toMatch(/No component or export named "Buton"\. Close matches: .*Button/)
  })

  it('search ranks names above prose, across components, patterns and tokens', async () => {
    expect((await call('search', { query: 'dialog' })).text.split('\n')[0]).toMatch(/^- component \*\*Dialog\*\*/)
    expect((await call('search', { query: 'confirmation' })).text).toContain('pattern **Confirmation**')
    expect((await call('search', { query: 'oro-soft' })).text).toContain('token **--oro-soft**')
    expect((await call('search', { query: 'zzz-nothing' })).text).toMatch(/^Nothing matches/)
  })

  it('search finds a component by the job its usage guidance describes', async () => {
    const top = async (query: string) => (await call('search', { query })).text.split('\n')[0]
    expect(await top('loading')).toMatch(/^- component \*\*Skeleton\*\*/)
    expect(await top('work with a known total')).toMatch(/^- component \*\*Progress\*\*/)
    expect(await top('confirm a destructive action')).toMatch(/^- pattern \*\*Confirmation\*\*/)
    // Stopwords do not have to match: "show" and "an" are in almost no page.
    expect(await top('how do I show an error')).toMatch(/^- component \*\*Run error\*\*/)
  })

  it('search credits a "when not to" line to the page it points to, not the page that rejects the job', async () => {
    // Progress's guidance says "Content loading into a known layout" is a job for Skeleton.
    const { text } = await call('search', { query: 'known layout' })
    expect(text.split('\n')[0]).toMatch(/^- component \*\*Skeleton\*\*/)
    expect(text).not.toContain('**Progress**')
  })

  it('search matches prose at the start of a word, so "loading" is not found inside "upload"', async () => {
    const { text } = await call('search', { query: 'loading', limit: 50 })
    expect(text).not.toContain('**File upload**')
  })

  it('get_tokens gives both theme values, and filters', async () => {
    const all = await call('get_tokens')
    expect(all.text).toContain(`${data.tokens.tokens.length} of ${data.tokens.tokens.length} tokens`)
    const ink = data.tokens.tokens.find((t) => t.name === '--ink')!
    expect(all.text).toContain(`| \`--ink\` | ink | \`${ink.light}\` | \`${ink.dark}\` | text, edge, surface, mark: `)
    const oro = await call('get_tokens', { filter: 'oro' })
    expect(oro.text).toContain('`--oro`')
    expect(oro.text).not.toContain('| `--cloth` |')
    expect((await call('get_tokens', { filter: 'control-h' })).text).toMatch(/`compact`: `--control-h: /)
    expect((await call('get_tokens', { filter: 'no-such-token' })).isError).toBe(true)
  })

  it('get_tokens scopes each colour to its utilities and lists the pairings it is promised', async () => {
    const { text } = await call('get_tokens', { filter: 'cloth-pale' })
    expect(text).toMatch(/\| `--cloth-pale` \|[^\n]*\| surface: `bg-cloth-pale` \|/)
    expect(text.split('\n').find((l) => l.startsWith('| `--cloth-pale`'))).not.toContain('text-cloth-pale')
    expect(text).toMatch(/- `--cloth-pale` carries `--ink` ≥ 4\.5, /)
    expect(text).toContain('## Scopes')
    // Gold is never text on light cloth, so it has no text utility, and its one text pairing is dark-only.
    const oro = data.tokens.tokens.find((t) => t.name === '--oro')!
    expect(oro.scopes).not.toContain('text')
    expect(oro.utilities).not.toContain('text-oro')
    expect(oro.on).toContainEqual({ token: '--cloth', min: 4.5, themes: ['dark'] })
    // A non-colour has neither.
    expect(data.tokens.tokens.find((t) => t.name === '--motion-base')!.scopes).toBeUndefined()
  })

  it('search finds a token by its scope', async () => {
    expect((await call('search', { query: 'overlay' })).text).toContain('token **--scrim**')
  })

  it('get_rules returns every design rule with its reason', async () => {
    const { text } = await call('get_rules')
    // Numbered, as check_code cites them.
    data.manifest.rules.forEach((r, i) => expect(text).toContain(`${i + 1}. ${r.rule}`))
    expect(text).toContain(data.manifest.install)
  })

  it('llms-rules.txt holds every rule, numbered as check_code cites them', () => {
    const file = readFileSync(join(findRoot(), 'llms-rules.txt'), 'utf8')
    data.manifest.rules.forEach((r, i) => expect(file).toContain(`\n${i + 1}. ${r.rule} ${r.why}\n`))
    expect(readFileSync(join(findRoot(), 'llms.txt'), 'utf8')).toContain('llms-rules.txt')
  })

  it('check_code reports each finding with its line, rule and fix, and cites the rules', async () => {
    const code = [
      "import { Button } from '@demogar/mola-ui'",
      '',
      'export const Save = ({ busy }: { busy: boolean }) => (',
      '  <Button disabled={busy} className="border border-ink rounded-lg opacity-50 bg-[#c00] pl-4">',
      '    Save',
      '  </Button>',
      ')',
    ].join('\n')
    const { text, isError } = await call('check_code', { code, filename: 'save.tsx' })
    expect(isError).toBe(false)
    expect(text).toMatch(/^# 4 errors, 1 warning/)
    expect(text).toContain('- **Line 4**, rule 1: `border` `border-ink` on <Button>')
    expect(text).toContain('Fix: Use `ps-4`.')
    expect(text).toContain('## Rules cited')
    expect(text).toContain('`// check_code: allow rule N — the reason`')
    for (const n of [1, 2, 4, 5, 7]) expect(text).toContain(`${n}. ${data.manifest.rules[n - 1]!.rule}`)
  })

  it('check_code says so when the code is clean, and names what it cannot check', async () => {
    const { text } = await call('check_code', { code: '<Button variant="ghost">Cancel run</Button>' })
    expect(text).toMatch(/^# No findings\n\n1 line checked/)
    expect(text).toContain('Not checkable from code: rule 3 (State is never colour alone)')
  })

  it('check_code checks CSS by file name', async () => {
    const { text } = await call('check_code', { code: '.panel { border-radius: 6px; }', filename: 'panel.css' })
    expect(text).toContain('rule 2: `border-radius: 6px`')
  })

  it('get_pattern returns a pattern’s guidance, and a showcase’s parts', async () => {
    const pattern = await call('get_pattern', { name: 'settings page' })
    for (const heading of ['## When to use', '## Built from', '## States', '## Accessibility']) expect(pattern.text).toContain(heading)
    expect((await call('get_pattern', { name: 'Agent console' })).text).toMatch(/^# Agent console \(showcase\)/)
    const missing = await call('get_pattern', { name: 'Checkout' })
    expect(missing.isError).toBe(true)
    expect(missing.text).toContain('Filtered table (pattern)')
  })
})
