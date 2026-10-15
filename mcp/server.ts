import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { checkCode, contextFrom } from './check'
import type { Alternative, Component, Data, Pattern } from './data'
import { checkMarkdown, componentBrief, componentLine, componentMarkdown, patternMarkdown, rulesMarkdown, tokensMarkdown } from './format'

/**
 * A read-only MCP server over the generated agent docs.
 *
 * Every tool answers from `Data` (docs/ai/components.json and tokens.json),
 * so it can never describe a prop the package does not have. `check_code`
 * reviews code it is given and returns findings; it reads the same data for
 * token and export names, and writes nothing. Nothing writes,
 * nothing reaches the network, and every tool is annotated read-only, so a
 * client can allow them without asking each time.
 *
 * Names are matched loosely ("date picker", "DatePicker", "date-picker"), and
 * an export resolves to the page that documents it (`IconButton` → Button),
 * because an agent usually knows the export it saw in code, not the page.
 */

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const text = (body: string) => ({ content: [{ type: 'text' as const, text: body }] })
const miss = (body: string) => ({ ...text(body), isError: true })

function findComponent(data: Data, name: string): { page: Component; via?: string } | null {
  const k = key(name)
  const pages = data.manifest.components
  const page = pages.find((c) => key(c.name) === k || key(c.title) === k || key(c.title.split('/').at(-1)!) === k)
  if (page) return { page }
  for (const c of pages) {
    const x = c.exports.find((e) => key(e.name) === k)
    if (x) return { page: c, via: x.name }
  }
  return null
}

function findPattern(data: Data, name: string): Pattern | null {
  const k = key(name)
  return data.manifest.patterns.find((p) => key(p.title) === k || key(p.title.split('/').at(-1)!) === k) ?? null
}

/** Edit distance between two keys, for suggestions. */
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = row
  }
  return prev[b.length]!
}

/** The closest names, for an error that helps rather than only refuses. */
function suggest(names: string[], query: string) {
  const k = key(query)
  const rank = (n: string) => (key(n).includes(k) || k.includes(key(n)) ? 0 : distance(key(n), k))
  return [...names].sort((a, b) => rank(a) - rank(b)).slice(0, 5).join(', ')
}

interface Hit {
  kind: 'component' | 'pattern' | 'token' | 'rule'
  name: string
  line: string
  score: number
}

/** Words that carry no meaning in a query ("how do I show a loading state"), so they need not match. */
const STOPWORDS = new Set('a an and are as at be by can do for from get how i in is it make my need of on or show should that the this to use want what when where which with without you'.split(' '))

/** A crude stem, so "loading" finds "loads" and "uploading" finds "upload"; "progress" keeps its double s. */
function stem(term: string) {
  for (const [suffix, by] of [['ies', 'y'], ['ing', ''], ['ed', ''], ['s', '']] as const) {
    if (term.endsWith(suffix) && !term.endsWith('ss') && term.length - suffix.length >= 3) return term.slice(0, -suffix.length) + by
  }
  return term
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A name matches anywhere in it ("picker" in "DatePicker"); prose matches at the start of a word, so "load" is not found in "download". */
type Field = [value: string | undefined, weight: number, mode?: 'name']

/**
 * Term matching with weights: a hit in a name outranks one in a summary,
 * which outranks a "when to use" phrase, which outranks the prose. Every
 * meaningful term must match somewhere, so "dialog destructive" narrows
 * rather than widens.
 *
 * Agents search by the job ("loading state", "confirm a destructive action"),
 * not by the name, and the jobs are written down twice in the usage guidance:
 * a page's "when to use" lines, and every other page's "when not to" lines,
 * which name the page to use instead. Before, both sat in the prose at weight
 * 1, and the "when not to" lines counted for the page that rejects the job:
 * "loading state" ranked Button and File upload above Progress, because
 * Progress's own guidance says to use Skeleton for loading content. Now a
 * "when to use" line weighs 3, a "when not to" line counts for the page it
 * points to (also 3), and a term the guidance repeats, or a query that sits
 * in one of those phrases, earns more.
 */
export function search(data: Data, query: string, limit = 10): Hit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const meaningful = words.filter((w) => !STOPWORDS.has(w))
  const terms = (meaningful.length ? meaningful : words).map((w) => ({ raw: w, re: new RegExp(`(^|[^a-z0-9])${escape(stem(w))}`) }))
  if (!terms.length) return []
  const phrase = words.join(' ')
  const matches = ([value, , mode]: Field, term: (typeof terms)[number]) => {
    const v = value?.toLowerCase()
    if (!v) return false
    return mode === 'name' ? v.includes(term.raw) || key(v).includes(key(term.raw)) : term.re.test(v)
  }
  /**
   * `jobs` are the page's usage phrases. Beyond the best field per term, a
   * term the guidance repeats earns a little more (a page whose jobs say
   * "loading" four times is about loading), and a query whose terms all sit
   * in one phrase, or appear in it word for word, earns a bonus.
   */
  const score = (fields: Field[], jobs: string[] = [], summary?: string) => {
    let total = 0
    for (const term of terms) {
      const best = Math.max(0, ...fields.map((f) => (matches(f, term) ? f[1] : 0)))
      if (!best) return 0
      const repeated = jobs.filter((j) => matches([j, 0], term)).length
      total += best + Math.max(0, Math.min(3, repeated) - 1)
    }
    const phrases = summary ? [summary, ...jobs] : jobs
    if (terms.length > 1 && phrases.some((p) => p.toLowerCase().includes(phrase))) total += 5
    else if (terms.length > 1 && phrases.some((p) => terms.every((t) => matches([p, 0], t)))) total += 3
    return total
  }

  // "When not to" lines, credited to the page they point to.
  const redirected = new Map<string, string[]>()
  const pointTo = (avoid: Alternative[] | undefined) => {
    for (const a of avoid ?? []) if (a.use) redirected.set(a.use, [...(redirected.get(a.use) ?? []), a.when])
  }
  for (const c of data.manifest.components) pointTo(c.usage?.avoid)
  for (const p of data.manifest.patterns) pointTo(p.guidance?.avoid)

  const hits: Hit[] = []
  for (const c of data.manifest.components) {
    const jobs = [...(c.usage?.use ?? []), ...(redirected.get(c.title) ?? [])]
    const s = score(
      [
        [c.name, 10, 'name'],
        [c.exports.map((x) => x.name).join(' '), 8, 'name'],
        [c.summary, 4],
        [c.title, 3, 'name'],
        [jobs.join(' '), 3],
        [c.exports.flatMap((x) => x.props?.map((p) => p.name) ?? []).join(' '), 2, 'name'],
        [[c.description, ...(c.accessibility?.handles ?? [])].join(' '), 1],
      ],
      jobs,
      c.summary,
    )
    if (s) hits.push({ kind: 'component', name: c.name, line: `${c.summary ?? ''} ${c.docs}`, score: s })
  }
  for (const p of data.manifest.patterns) {
    const jobs = [...(p.guidance?.use ?? []), ...(redirected.get(p.title) ?? [])]
    const s = score(
      [
        [p.title.split('/').at(-1), 10, 'name'],
        [p.guidance?.summary ?? p.summary, 4],
        [jobs.join(' '), 3],
        [p.description, 1],
      ],
      jobs,
      p.guidance?.summary ?? p.summary,
    )
    if (s) hits.push({ kind: 'pattern', name: p.title.split('/').at(-1)!, line: `${p.guidance?.summary ?? p.summary ?? p.kind} ${p.docs}`, score: s })
  }
  for (const t of data.tokens.tokens) {
    const s = score([
      [t.name, 6, 'name'],
      [t.note, 3],
      [t.group, 2, 'name'],
      [[...(t.scopes ?? []), ...(t.utilities ?? [])].join(' '), 2, 'name'],
    ])
    const scoped = t.scopes ? `; ${t.scopes.join(', ')}${t.utilities?.length ? `: ${t.utilities.join(' ')}` : ''}` : ''
    if (s) hits.push({ kind: 'token', name: t.name, line: `${[t.group, t.note].filter(Boolean).join(': ')}; light ${t.light}, dark ${t.dark}${scoped}`, score: s })
  }
  data.manifest.rules.forEach((r, i) => {
    const s = score([[`${r.rule} ${r.why}`, 2]])
    if (s) hits.push({ kind: 'rule', name: `Rule ${i + 1}`, line: r.rule, score: s })
  })
  return hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit)
}

export function createServer(data: Data) {
  const { manifest } = data
  const server = new McpServer(
    { name: 'mola-ui', title: 'Mola UI', version: data.version },
    {
      instructions: [
        `Docs for ${manifest.name} ${data.version}, the design system installed in this project, read from its generated manifest.`,
        'Call get_rules before writing UI, then get_component for each component you use (brief: true when you only need the props and usage): never guess a prop.',
        'Use search when you know the job but not the component, get_tokens for colours and sizes, and get_pattern for whole screens.',
        'Before handing UI code back, run it through check_code and fix what it finds.',
      ].join(' '),
    },
  )

  server.registerTool(
    'list_components',
    {
      title: 'List components',
      description: 'Every documented component, grouped by category, with a one-line summary and its exported parts.',
      inputSchema: {
        layer: z.enum(['components', 'ai']).optional().describe('Only the core components, or only the AI interface layer.'),
      },
      annotations: READ_ONLY,
    },
    async ({ layer }) => {
      const pages = manifest.components.filter((c) => !layer || c.layer === layer)
      const groups = new Map<string, Component[]>()
      for (const c of pages) {
        const group = c.layer === 'ai' ? 'AI interface' : c.category
        groups.set(group, [...(groups.get(group) ?? []), c])
      }
      const body = [...groups].map(([group, items]) => `## ${group}\n\n${items.map((c) => componentLine(c, data)).join('\n')}`).join('\n\n')
      // The heading says what the README and llms.txt say, from the same
      // generated counts: it used to print 66 "components" where the README
      // said 54, because it counted the AI layer and gave no breakdown.
      const size = layer === 'ai' ? `${pages.length} AI components` : layer === 'components' ? `${pages.length} components` : manifest.counts.summary
      return text(`# ${size} in ${manifest.name} ${data.version}\n\nCall get_component with a name for props, usage and accessibility.\n\n${body}\n`)
    },
  )

  server.registerTool(
    'get_component',
    {
      title: 'Get a component',
      description:
        'One component page: summary, usage (when to use, when not to, do and don’t), props of every export, accessibility, anatomy, where it is used, and links to its examples. Accepts a page name ("Date picker") or an export ("IconButton"). With brief, only the summary, when to use and not, each export’s props on one line and what you must handle for accessibility, at a fraction of the size.',
      inputSchema: {
        name: z.string().min(1).describe('Component or export name, e.g. "Button", "IconButton", "date picker".'),
        brief: z.boolean().optional().describe('Only what writing the code needs: summary, usage, props without descriptions, and what you handle. Default false.'),
      },
      annotations: READ_ONLY,
    },
    async ({ name, brief }) => {
      const found = findComponent(data, name)
      if (!found) return miss(`No component or export named "${name}". Close matches: ${suggest(manifest.components.map((c) => c.name), name)}.`)
      return text((brief ? componentBrief : componentMarkdown)(found.page, data, found.via))
    },
  )

  server.registerTool(
    'search',
    {
      title: 'Search the docs',
      description:
        'Search components, patterns, tokens and rules by name or by the job ("loading state", "confirm a destructive action"). Every meaningful word must match; names rank above summaries, summaries above the usage guidance’s when-to-use phrases, and those above prose.',
      inputSchema: {
        query: z.string().min(1).describe('Words to look for, e.g. "confirm destructive", "loading", "oro".'),
        limit: z.number().int().min(1).max(50).optional().describe('At most this many results (default 10).'),
      },
      annotations: READ_ONLY,
    },
    async ({ query, limit }) => {
      const hits = search(data, query, limit ?? 10)
      if (!hits.length) return text(`Nothing matches "${query}". Try fewer words, or list_components.\n`)
      return text(`${hits.map((h) => `- ${h.kind} **${h.name}**: ${h.line}`).join('\n')}\n`)
    },
  )

  server.registerTool(
    'get_tokens',
    {
      title: 'Get design tokens',
      description:
        'Design tokens from tokens.css with their role and resolved value in the light and the dark theme, plus what each density redefines. A colour also gets its scopes (surface, text, edge, mark, overlay), the only Tailwind utilities valid for it, and the contrast pairings it is promised. Filter by name, section, note, value, scope or utility.',
      inputSchema: {
        filter: z.string().optional().describe('Text to match, e.g. "oro", "ink", "motion", "control-h". Leave out for every token.'),
      },
      annotations: READ_ONLY,
    },
    async ({ filter }) => {
      const f = filter?.trim().toLowerCase() ?? ''
      const rows = data.tokens.tokens.filter(
        (t) => !f || [t.name, t.group, t.note ?? '', t.light, t.dark, ...(t.scopes ?? []), ...(t.utilities ?? [])].some((v) => v.toLowerCase().includes(f)),
      )
      const density = Object.fromEntries(
        Object.entries(data.tokens.density)
          .map(([d, values]) => [d, Object.fromEntries(Object.entries(values).filter(([n]) => !f || n.includes(f) || 'density'.includes(f)))] as const)
          .filter(([, values]) => Object.keys(values).length),
      )
      if (!rows.length && !Object.keys(density).length) return miss(`No token matches "${filter}".`)
      const utilities = `In markup, use a utility from the "Use as" column rather than the variable, and no other: Tailwind compiles \`text-cloth-pale\`, but \`--cloth-pale\` is a surface, so only \`bg-cloth-pale\` is right. Never write a hex value outside tokens.css.`
      return text(
        `${rows.length} of ${data.tokens.tokens.length} tokens. ${utilities}\n\n${tokensMarkdown(rows, Object.keys(density).length ? density : null, data.tokens.scopes)}`,
      )
    },
  )

  server.registerTool(
    'get_rules',
    {
      title: 'Get the design rules',
      description: 'The design rules every screen is reviewed against, each with its reason, plus setup, theme and density attributes and what each lifecycle phase promises.',
      annotations: READ_ONLY,
    },
    async () => text(rulesMarkdown(data)),
  )

  server.registerTool(
    'get_pattern',
    {
      title: 'Get a pattern',
      description:
        'A whole screen composed from the components (a pattern such as "Confirmation" or "Filtered table", or a showcase such as "Agent console"): when to use it, what it is built from, its states and accessibility.',
      inputSchema: { name: z.string().min(1).describe('Pattern or showcase name, e.g. "Settings page".') },
      annotations: READ_ONLY,
    },
    async ({ name }) => {
      const pattern = findPattern(data, name)
      if (!pattern) {
        return miss(`No pattern named "${name}". Available: ${manifest.patterns.map((p) => `${p.title.split('/').at(-1)} (${p.kind})`).join(', ')}.`)
      }
      return text(patternMarkdown(pattern))
    },
  )

  const checkContext = contextFrom(data)

  server.registerTool(
    'check_code',
    {
      title: 'Check code against the rules',
      description:
        'Review UI code you wrote (TSX, JSX or CSS) against the design rules before handing it back: borders on controls, radius, faded disabled states, colour literals, names that are not tokens and tokens used outside their scope, physical left/right, spinners, hand-rolled dialogs and menus, other UI libraries and imports the package does not export. Returns each finding with its line, the rule it breaks and the fix, or "No findings". Deterministic, and it changes nothing.',
      inputSchema: {
        code: z.string().min(1).describe('The source to check: a component, a screen, or a stylesheet.'),
        filename: z.string().optional().describe('Its file name, for the language: "settings.tsx", "app.css". Without one, CSS is recognised by its shape.'),
      },
      annotations: READ_ONLY,
    },
    async ({ code, filename }) => text(checkMarkdown(checkCode(code, checkContext, { filename }), data, code.split('\n').length)),
  )

  return server
}
