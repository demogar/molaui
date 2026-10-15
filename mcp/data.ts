import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The generated agent docs the server answers from: docs/ai/components.json
 * and docs/ai/tokens.json, written by scripts/export-manifest.ts and shipped
 * in the package (`files` in package.json). The server never parses the
 * source itself: the manifest is already what the compiler and Storybook
 * see, and manifest:check keeps it current, so reading it is how the server
 * stays in sync. Installed from npm, it answers for exactly the version
 * installed beside it.
 *
 * The shapes below are the subset the server reads, not a second schema.
 */

export interface Prop {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
  /** The literal values, when `type` names an alias rather than spelling them out. */
  values?: string[]
  /** The `@deprecated` note: since when, what to use, when it goes. */
  deprecated?: string
}

export interface Export {
  name: string
  kind: string
  source: string
  description?: string
  props?: Prop[]
  inherits?: string[]
  variants?: Record<string, { values: string[]; default?: string }>
  /** Where `className`, `ref` and the other DOM props go. `element: null` renders no element. */
  forwards?: { element: string | null; className?: string }
}

export interface Alternative {
  when: string
  use: string | null
  label?: string
}

export interface Component {
  title: string
  name: string
  layer: 'components' | 'ai'
  category: string
  docs: string
  phase?: string
  summary?: string
  description?: string
  usage?: {
    use: string[]
    avoid: Alternative[]
    practices?: { do: string; dont: string }[]
    content?: string[]
    replacedBy?: string
  }
  accessibility?: { keyboard?: { keys: string[]; action: string }[]; handles: string[]; you: string[] }
  anatomy?: { slot: string; parts: { part: string; name: string; does: string; selector: string }[] }
  exports: Export[]
  stories: { name: string; id: string; url: string }[]
  usedIn?: string[]
  /** Its entries in CHANGELOG.md, newest first. */
  changes?: { version: string; date?: string; type: string; breaking: boolean; subject: string; pr?: { number: number; url: string } }[]
}

export interface Pattern {
  title: string
  /** Always `pattern`: the showcases that were the other kind became patterns. Kept so readers of the JSON do not break. */
  kind: 'pattern'
  docs: string
  summary?: string
  description?: string
  builtFrom: string[]
  guidance?: {
    summary: string
    use: string[]
    avoid: Alternative[]
    parts: { title: string; role: string }[]
    states: Record<string, { story?: string; applies?: false; note: string }>
    accessibility: string[]
  }
  stories: { name: string; id: string; url: string }[]
}

export interface Manifest {
  name: string
  description: string
  storybook: string
  install: string
  rules: { rule: string; why: string }[]
  phases: Record<string, { label: string; promise: string }>
  /** Generated with the manifest; `summary` is the sentence every surface uses for the size of the system. */
  counts: { components: number; aiComponents: number; pages: number; summary: string }
  tokens: { scopes: Record<string, Scope>; colors: ({ token: string } & ColorInfo)[]; attributes: Record<string, string[]> }
  components: Component[]
  patterns: Pattern[]
  utilities: { name: string; kind: string; source: string; description?: string }[]
}

/** One of the closed set of colour scopes (src/tokens/scopes.ts). */
export interface Scope {
  meaning: string
  tailwind: string[]
  publish: string[]
  figma: string[]
}

export interface Pairing {
  token: string
  min: number
  themes?: string[]
}

/** What a colour token may be used for, and the contrast it is promised from each side. */
export interface ColorInfo {
  scopes: string[]
  why?: string
  utilities: string[]
  on: Pairing[]
  under: Pairing[]
}

export interface Token extends Partial<ColorInfo> {
  name: string
  group: string
  note?: string
  raw: string
  light: string
  dark: string
  isColor: boolean
}

export interface Tokens {
  scopes: Record<string, Scope>
  tokens: Token[]
  density: Record<string, Record<string, string>>
}

export interface Data {
  version: string
  manifest: Manifest
  tokens: Tokens
}

/**
 * The package root: the nearest directory above `from` that holds
 * docs/ai/components.json. The source (mcp/) and the build
 * (dist/mcp/mola-ui-mcp.js) sit at different depths, so the root is found
 * rather than assumed.
 */
export function findRoot(from: string = dirname(fileURLToPath(import.meta.url))): string {
  let dir = resolve(from)
  for (;;) {
    if (existsSync(join(dir, 'docs/ai/components.json'))) return dir
    const up = dirname(dir)
    if (up === dir) throw new Error(`docs/ai/components.json not found above ${from}`)
    dir = up
  }
}

export function loadData(root: string = findRoot()): Data {
  const json = <T>(path: string) => JSON.parse(readFileSync(join(root, path), 'utf8')) as T
  return {
    version: json<{ version: string }>('package.json').version,
    manifest: json<Manifest>('docs/ai/components.json'),
    tokens: json<Tokens>('docs/ai/tokens.json'),
  }
}
