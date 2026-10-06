/**
 * The source -> agent-readable docs.
 *
 *   docs/ai/components.json   every documented component: its exports, props
 *                             (types, defaults, doc comments), cva variants,
 *                             usage guidance and story links, plus the rules
 *   llms.txt                  the index an agent reads first (llmstxt.org)
 *   llms-full.txt             the same with every component's guidance and
 *                             props inline, for an agent that reads one file
 *
 * Like tokens/mola.tokens.json these are derived artefacts, never edited: an
 * agent that builds UI from a stale prop list writes code that does not
 * compile. So they are generated from what the compiler and Storybook see —
 * the exports of src/index.ts through the TypeScript checker, props through
 * react-docgen-typescript (the parser Storybook's own props tables use), the
 * stories' titles and descriptions by importing them — and CI fails if the
 * committed copies are stale.
 *
 *   npm run manifest            writes all three
 *   npm run manifest:check      fails if any is stale (CI)
 */
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'

import { withCompilerOptions, type ComponentDoc, type PropItem } from 'react-docgen-typescript'
import { isExportStory } from 'storybook/internal/csf'
import ts from 'typescript'

import pkg from '../package.json' with { type: 'json' }
import { USAGE, type Usage } from '../src/docs/usage/guidance'
import { docsId, storyId } from '../src/docs/usage/links'
import { RULES } from '../src/docs/usage/rules'

const root = resolve(import.meta.dirname, '..')
const SITE = pkg.homepage.replace(/\/?$/, '/')
const rel = (path: string) => relative(root, path).split('\\').join('/')
const docsUrl = (title: string) => `${SITE}?path=/docs/${docsId(title)}`
const storyUrl = (id: string) => `${SITE}?path=/story/${id}`

/* ── the exports, as the compiler sees them ─────────────────────────── */

const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
const program = ts.createProgram([resolve(root, 'src/index.ts')], { ...parsed.options, noEmit: true })
const checker = program.getTypeChecker()
const index = program.getSourceFile(resolve(root, 'src/index.ts'))!
const indexSymbol = checker.getSymbolAtLocation(index)!

type Kind = 'component' | 'hook' | 'function' | 'constant' | 'type'

interface ExportInfo {
  name: string
  kind: Kind
  source: string
  description?: string
}

function kindOf(name: string, symbol: ts.Symbol): Kind {
  if (!(symbol.flags & ts.SymbolFlags.Value)) return 'type'
  if (/^use[A-Z]/.test(name)) return 'hook'
  const decl = symbol.valueDeclaration ?? symbol.declarations?.[0]
  const callable = decl ? checker.getTypeOfSymbolAtLocation(symbol, decl).getCallSignatures().length > 0 : false
  if (/^[A-Z][A-Z0-9_]+$/.test(name)) return 'constant'
  if (/^[A-Z]/.test(name)) {
    // A React context object is PascalCase and not callable.
    return callable && !/Context$/.test(name) ? 'component' : 'constant'
  }
  return callable ? 'function' : 'constant'
}

function firstParagraph(text: string) {
  return text.split(/\n\s*\n/)[0]!.replace(/\s*\n\s*/g, ' ').trim()
}

const exportsInfo: ExportInfo[] = checker.getExportsOfModule(indexSymbol).map((alias) => {
  const symbol = alias.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(alias) : alias
  const decl = symbol.declarations?.[0]
  const file = decl?.getSourceFile().fileName ?? ''
  const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker))
  return {
    name: alias.name,
    kind: kindOf(alias.name, symbol),
    source: file.includes('node_modules') ? (file.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/)?.[1] ?? 'external') : rel(file),
    ...(doc ? { description: firstParagraph(doc) } : {}),
  }
})

/* ── props, the way Storybook's props table reads them ──────────────── */

const parser = withCompilerOptions(parsed.options, {
  savePropValueAsString: true,
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  // Every DOM attribute React knows would bury the props that are ours.
  propFilter: (prop) => !(prop.declarations?.length && prop.declarations.every((d) => d.fileName.includes('@types/react'))),
})

const componentFiles = [...new Set(exportsInfo.filter((e) => e.kind === 'component' && e.source.startsWith('src/')).map((e) => resolve(root, e.source)))]
const docs = new Map<string, ComponentDoc>()
for (const doc of parser.parseWithProgramProvider(componentFiles, () => program)) {
  docs.set(`${rel(doc.filePath)}#${doc.displayName}`, doc)
}

interface Prop {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
}

function propOf(prop: PropItem): Prop {
  const type = prop.type.raw && prop.type.name === 'enum' ? prop.type.raw : prop.type.name
  return {
    name: prop.name,
    type: type.replace(/\s+/g, ' '),
    required: prop.required,
    ...(prop.defaultValue?.value !== undefined ? { default: String(prop.defaultValue.value) } : {}),
    ...(prop.description ? { description: firstParagraph(prop.description) } : {}),
  }
}

/** Where a component's other props come from: the element or the Base UI part it renders. */
function inherits(doc: ComponentDoc) {
  const from = new Set<string>()
  for (const p of Object.values(doc.props)) {
    const file = p.parent?.fileName ?? ''
    if (file.includes('node_modules') && !/@types\/react|class-variance-authority/.test(file)) from.add(p.parent!.name)
  }
  return [...from].sort()
}

/* ── cva variants, read from the call rather than inferred from types ── */

type Variants = Record<string, { values: string[]; default?: string }>

function cvaVariants(file: string): Record<string, Variants> {
  const source = program.getSourceFile(file)
  const found: Record<string, Variants> = {}
  if (!source) return found
  const objectProp = (obj: ts.ObjectLiteralExpression, key: string) =>
    obj.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(source) === key)?.initializer
  const keyText = (p: ts.ObjectLiteralElementLike) => p.name?.getText(source).replace(/^['"]|['"]$/g, '') ?? ''
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(source) === 'cva') {
      const options = node.initializer.arguments[1]
      if (options && ts.isObjectLiteralExpression(options)) {
        const variants = objectProp(options, 'variants')
        const defaults = objectProp(options, 'defaultVariants')
        const result: Variants = {}
        if (variants && ts.isObjectLiteralExpression(variants)) {
          for (const v of variants.properties) {
            if (!ts.isPropertyAssignment(v) || !ts.isObjectLiteralExpression(v.initializer)) continue
            result[keyText(v)] = { values: v.initializer.properties.map(keyText) }
          }
        }
        if (defaults && ts.isObjectLiteralExpression(defaults)) {
          for (const d of defaults.properties) {
            const entry = result[keyText(d)]
            if (entry && ts.isPropertyAssignment(d)) entry.default = d.initializer.getText(source).replace(/^['"]|['"]$/g, '')
          }
        }
        found[node.name.getText(source)] = result
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

/* ── stories: titles, descriptions, story ids ───────────────────────── */

interface StoriesFile {
  file: string
  title: string
  component?: unknown
  description?: string
  stories: { name: string; id: string }[]
  /** Source modules the stories file imports, absolute, without extension. */
  imports: Set<string>
}

const storyFiles = globSync('src/**/*.stories.tsx', { cwd: root }).sort()
const stories: StoriesFile[] = []
for (const file of storyFiles) {
  const mod = (await import(resolve(root, file))) as Record<string, unknown> & {
    default: { title: string; component?: unknown; parameters?: { docs?: { description?: { component?: string } } } }
  }
  const meta = mod.default
  const text = readFileSync(resolve(root, file), 'utf8')
  const imports = new Set(
    [...text.matchAll(/from '(\.[^']+)'/g)].map((m) => resolve(dirname(resolve(root, file)), m[1]!)),
  )
  stories.push({
    file,
    title: meta.title,
    component: meta.component,
    description: meta.parameters?.docs?.description?.component,
    stories: Object.keys(mod)
      .filter((key) => key !== 'default' && isExportStory(key, meta as never))
      .map((key) => ({ name: key, id: storyId(meta.title, key) })),
    imports,
  })
}

/**
 * Which docs page documents an export. A folder can hold several stories
 * files (layout has one per part), so prefer the one named like the export's
 * source file, then the one whose meta.component it is, then one that imports
 * it, then any page in the folder with usage guidance (not a showcase).
 */
async function titleFor(info: ExportInfo): Promise<string | null> {
  if (!info.source.startsWith('src/components/')) return null
  const abs = resolve(root, info.source)
  const dir = dirname(abs)
  const stem = abs.replace(/\.tsx?$/, '')
  const local = stories.filter((s) => dirname(resolve(root, s.file)) === dir)
  const value = info.kind === 'type' ? undefined : (await import(abs))[info.name]
  const pick =
    local.find((s) => basename(s.file, '.stories.tsx') === basename(stem)) ??
    local.find((s) => value !== undefined && s.component === value) ??
    local.find((s) => s.imports.has(stem) && USAGE[s.title]) ??
    local.find((s) => USAGE[s.title]) ??
    local[0]
  return pick?.title ?? null
}

/* ── assemble ───────────────────────────────────────────────────────── */

interface ExportEntry extends ExportInfo {
  props?: Prop[]
  inherits?: string[]
  variants?: Variants
}

interface Entry {
  title: string
  name: string
  layer: 'components' | 'ai'
  category: string
  docs: string
  summary?: string
  description?: string
  usage?: Omit<Usage, 'summary'>
  exports: ExportEntry[]
  stories: { name: string; id: string; url: string }[]
}

const entries = new Map<string, Entry>()
const utilities: ExportInfo[] = []
const variantCache = new Map<string, Record<string, Variants>>()

for (const info of exportsInfo) {
  const title = await titleFor(info)
  if (!title) {
    utilities.push(info)
    continue
  }
  const s = stories.find((x) => x.title === title)!
  let entry = entries.get(title)
  if (!entry) {
    const segments = title.split('/')
    const usage = USAGE[title]
    entry = {
      title,
      name: segments.at(-1)!,
      layer: segments[0] === 'AI' ? 'ai' : 'components',
      category: segments.length > 2 ? segments[1]! : segments[0]!,
      docs: docsUrl(title),
      ...(usage ? { summary: usage.summary } : {}),
      ...(s.description ? { description: s.description } : {}),
      ...(usage ? { usage: { use: usage.use, avoid: usage.avoid, practices: usage.practices, content: usage.content } } : {}),
      exports: [],
      stories: s.stories.map((story) => ({ ...story, url: storyUrl(story.id) })),
    }
    entries.set(title, entry)
  }
  const item: ExportEntry = { ...info }
  if (info.kind === 'component') {
    const file = resolve(root, info.source)
    if (!variantCache.has(file)) variantCache.set(file, cvaVariants(file))
    // A cva belongs to the component it is named for: `calloutVariants` ->
    // Callout, or by prefix, `recommendationVariants` -> RecommendationBadge.
    const cvas = Object.entries(variantCache.get(file)!)
    const lower = info.name.toLowerCase()
    const own =
      cvas.find(([name]) => name.toLowerCase() === `${lower}variants`) ??
      cvas.find(([name]) => lower.startsWith(name.toLowerCase().replace(/variants$/, '')))
    if (own && Object.keys(own[1]).length) item.variants = own[1]
    const doc = docs.get(`${info.source}#${info.name}`)
    if (doc) {
      // Our own props, and the variant props cva declares (their type lives in
      // class-variance-authority, but the values are ours). Props inherited
      // from Base UI are named in `inherits` rather than listed.
      item.props = Object.values(doc.props)
        .filter((p) => (p.parent ? !p.parent.fileName.includes('node_modules') : !p.declarations?.length) || (item.variants && p.name in item.variants))
        .map(propOf)
        .map((prop) => {
          // The checker prints a union in whatever order it met the members;
          // the cva call is the order the author wrote them in, and stable.
          const variant = item.variants?.[prop.name]
          return variant ? { ...prop, type: variant.values.map((v) => (/^(true|false|\d+)$/.test(v) ? v : `"${v}"`)).join(' | ') } : prop
        })
        .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name))
      const from = inherits(doc)
      if (from.length) item.inherits = from
    }
  }
  entry.exports.push(item)
}

const sorted = [...entries.values()].sort((a, b) => a.title.localeCompare(b.title))
for (const entry of sorted) entry.exports.sort((a, b) => Number(b.kind === 'component') - Number(a.kind === 'component'))

const showcases = stories.filter((s) => !entries.has(s.title)).map((s) => ({
  title: s.title,
  docs: docsUrl(s.title),
  ...(s.description ? { description: s.description } : {}),
  stories: s.stories.map((story) => ({ ...story, url: storyUrl(story.id) })),
}))

/**
 * The figures the README and the introduction quote. A component is a docs
 * page (Button and IconButton are one component); a part is an exported React
 * component (Table, TableRow, TableCell…).
 */
const parts = (layer: Entry['layer']) =>
  sorted.filter((e) => e.layer === layer).reduce((n, e) => n + e.exports.filter((x) => x.kind === 'component').length, 0)
const counts = {
  components: sorted.filter((e) => e.layer === 'components').length,
  parts: parts('components'),
  aiComponents: sorted.filter((e) => e.layer === 'ai').length,
  aiParts: parts('ai'),
  stories: stories.reduce((n, s) => n + s.stories.length, 0),
}

const colorUtilities = [...readFileSync(resolve(root, 'src/styles/theme.css'), 'utf8').matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]!)

const install = `npm install ${pkg.name} @base-ui/react @fontsource-variable/archivo @fontsource-variable/alegreya @fontsource-variable/martian-mono`

const manifest = {
  $comment: 'Generated by scripts/export-manifest.ts from the source. Do not edit: run `npm run manifest`.',
  name: pkg.name,
  description: pkg.description,
  storybook: SITE,
  install,
  rules: RULES,
  counts,
  tokens: {
    source: 'src/styles/tokens.css',
    dtcg: 'tokens/mola.tokens.json',
    colorUtilities: colorUtilities.map((c) => `bg-${c} / text-${c}`),
    attributes: { 'data-theme': ['light', 'dark'], 'data-density': ['compact', 'comfortable', 'spacious'], dir: ['ltr', 'rtl'] },
  },
  components: sorted,
  patterns: showcases,
  utilities,
}

/* ── llms.txt and llms-full.txt ─────────────────────────────────────── */

const linkLine = (e: Entry) => `- [${e.name}](${e.docs})${e.summary ? `: ${e.summary}` : ''}`
const byLayer = (layer: Entry['layer']) => sorted.filter((e) => e.layer === layer)
const categories = [...new Set(byLayer('components').map((e) => e.category))]

const rulesBlock = RULES.map((r) => `- ${r.rule} ${r.why}`).join('\n')

const header = `# Mola UI

> ${pkg.description} Published as \`${pkg.name}\`: React 19, Base UI for behaviour, Tailwind v4 for styling, design tokens as CSS custom properties.

Install and set up:

\`\`\`bash
${install}
\`\`\`

\`\`\`tsx
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import '${pkg.name}/styles.css'
import { Button } from '${pkg.name}'
\`\`\`

Theme and density are attributes, not props: \`<html data-theme="dark" data-density="compact">\`. Already on Tailwind v4? Import \`${pkg.name}/tailwind.css\` into your own build instead of \`styles.css\`. For right-to-left, set \`dir="rtl"\` on \`<html>\` and wrap the app in \`DirectionProvider\`.

## Rules

${rulesBlock}
`

const llms = `${header}
## Docs

- [Choosing a component](${SITE}?path=/docs/mola-ui-choosing-a-component--overview): which component for which job, and what to use instead
- [Getting started](${SITE}?path=/docs/mola-ui-getting-started--overview): install, theme, density, right-to-left, Tailwind
- [Principles](${SITE}?path=/docs/mola-ui-principles--overview): the six rules every component obeys
- [AI interface principles](${SITE}?path=/docs/ai-principles--overview): streaming, latency, approval, uncertainty, failure
- [Versioning](${SITE}?path=/docs/mola-ui-versioning--overview): what counts as breaking, deprecation, codemods
- [Component manifest](https://github.com/demogar/molaui/blob/main/docs/ai/components.json): every export, prop, variant and story as JSON
- [Full text](${SITE}llms-full.txt): this file with every component's guidance and props inline

${categories.map((c) => `## ${c}\n\n${byLayer('components').filter((e) => e.category === c).map(linkLine).join('\n')}`).join('\n\n')}

## AI interface

${byLayer('ai').map(linkLine).join('\n')}

## Patterns

${showcases.map((s) => `- [${s.title.split('/').at(-1)}](${s.docs})`).join('\n')}
`

function propsTable(item: ExportEntry) {
  if (!item.props?.length) return ''
  const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const rows = item.props.map((p) => `| \`${p.name}\`${p.required ? ' (required)' : ''} | \`${cell(p.type)}\` | ${p.default ? `\`${cell(p.default)}\`` : ''} | ${cell(p.description ?? '')} |`)
  const extra = item.inherits?.length ? `\nAlso accepts the props of ${item.inherits.map((n) => `\`${n}\``).join(', ')}.\n` : ''
  return `\n| Prop | Type | Default | Description |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n${extra}`
}

function fullEntry(e: Entry) {
  const parts = [`### ${e.name}`, '', `${e.docs}`, '']
  if (e.summary) parts.push(e.summary, '')
  if (e.usage) {
    parts.push('When to use:', ...e.usage.use.map((l) => `- ${l}`), '')
    parts.push(
      'When not to:',
      ...e.usage.avoid.map((a) => `- ${a.when}${a.use ? ` Use ${a.label ?? a.use.split('/').at(-1)}.` : ''}`),
      '',
    )
    if (e.usage.practices?.length) parts.push(...e.usage.practices.flatMap((p) => [`- Do: ${p.do}`, `- Don’t: ${p.dont}`]), '')
    if (e.usage.content?.length) parts.push('Content:', ...e.usage.content.map((l) => `- ${l}`), '')
  }
  for (const item of e.exports.filter((x) => x.kind !== 'type')) {
    parts.push(`#### \`${item.name}\` (${item.kind})`, '')
    if (item.description) parts.push(item.description, '')
    if (item.variants) {
      parts.push(
        ...Object.entries(item.variants).map(([k, v]) => `- \`${k}\`: ${v.values.map((x) => `\`${x}\``).join(', ')}${v.default ? ` (default \`${v.default}\`)` : ''}`),
        '',
      )
    }
    const table = propsTable(item)
    if (table) parts.push(table.trim(), '')
  }
  const types = e.exports.filter((x) => x.kind === 'type').map((x) => `\`${x.name}\``)
  if (types.length) parts.push(`Types: ${types.join(', ')}`, '')
  return parts.join('\n')
}

const full = `${header}
${categories.map((c) => `## ${c}\n\n${byLayer('components').filter((e) => e.category === c).map(fullEntry).join('\n')}`).join('\n')}
## AI interface

${byLayer('ai').map(fullEntry).join('\n')}
## Utilities

${utilities.map((u) => `- \`${u.name}\` (${u.kind}, ${u.source})${u.description ? `: ${u.description}` : ''}`).join('\n')}
`

/* ── write or check ─────────────────────────────────────────────────── */

const outputs: [string, string][] = [
  ['docs/ai/components.json', `${JSON.stringify(manifest, null, 2)}\n`],
  ['llms.txt', llms],
  ['llms-full.txt', full],
]

/**
 * The counts in prose drift every time a component is added ("Things that
 * drift" in CLAUDE.md), so the claims are checked against the source here
 * rather than remembered.
 */
const CLAIMS: [string, string[]][] = [
  ['README.md', [`**${counts.components} components.**`, `${counts.parts} exported parts`, `all ${counts.stories} stories`]],
  ['src/docs/introduction.mdx', [`**${counts.components} documented components** (${counts.parts} exported parts)`]],
]
const wrong = CLAIMS.flatMap(([file, phrases]) => {
  const text = readFileSync(resolve(root, file), 'utf8')
  return phrases.filter((phrase) => !text.includes(phrase)).map((phrase) => `${file} should say "${phrase}"`)
})
if (wrong.length) {
  console.error(`Counts are out of date:\n  ${wrong.join('\n  ')}`)
  process.exitCode = 1
}

if (process.argv.includes('--check')) {
  const stale = outputs.filter(([path, text]) => {
    try {
      return readFileSync(resolve(root, path), 'utf8') !== text
    } catch {
      return true
    }
  })
  if (stale.length) {
    console.error(`Stale: ${stale.map(([p]) => p).join(', ')}. Run \`npm run manifest\` and commit the result.`)
    process.exit(1)
  }
  console.log('Agent docs are up to date.')
} else {
  for (const [path, text] of outputs) writeFileSync(resolve(root, path), text)
  console.log(`Wrote ${outputs.map(([p]) => p).join(', ')}: ${counts.components} components (${counts.parts} parts), ${counts.aiComponents} AI components, ${counts.stories} stories.`)
}
