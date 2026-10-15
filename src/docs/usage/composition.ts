/**
 * Which library components a composed screen is built from, read from its
 * imports rather than written down.
 *
 * A hand-kept "built from" list is right on the day it is written and wrong
 * the first time someone swaps a Select for a Combobox. So the list is
 * derived: scripts/export-manifest.ts reads each pattern's
 * source, keeps the names it imports from `src/components/…` (by relative
 * path or the `@/` alias), maps each name to the docs page that documents it,
 * and writes the result to docs/ai/composition.json. The pattern pages render
 * "Built from" from that file, and every component page renders "Used in"
 * from the same file read the other way round. composition.test.ts parses
 * the sources again and fails if the file, or the guidance written about
 * each part, has drifted from the imports.
 *
 * Pure string work, no `fs`: the manifest script runs it in Node and the
 * test runs it in Vitest.
 */

export interface SourceFile {
  /** Repository-relative, forward slashes: `src/patterns/confirmation/confirmation.tsx`. */
  path: string
  text: string
}

/**
 * What a composition is. Only `pattern` (a whole screen to copy) is left:
 * the showcases, demos of one layer outside any page contract, became
 * patterns. The field stays so the JSON keeps its shape for its readers.
 */
export type CompositionKind = 'pattern'

export interface Composition {
  kind: CompositionKind
  /** Stories titles of the component pages it imports from, sorted. */
  builtFrom: string[]
}

/**
 * Story data and fixtures live beside components but are not parts of the
 * library: a pattern borrowing a fixture's rows is not "built from" it.
 */
const NOT_A_PART = /\/_story-data\/|\.fixture$/

const IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g

function normalize(path: string) {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

function resolveSpecifier(from: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`
  if (!specifier.startsWith('.')) return null
  const dir = from.split('/').slice(0, -1).join('/')
  return normalize(`${dir}/${specifier}`)
}

/**
 * The value names a file imports from the component library: `type` imports
 * and `type` specifiers are left out (a type is not something on the
 * screen), and so are fixtures and story data.
 */
export function componentImports(file: SourceFile): string[] {
  const names: string[] = []
  for (const match of file.text.matchAll(IMPORT)) {
    const [, typeOnly, list, specifier] = match
    if (typeOnly) continue
    const target = resolveSpecifier(file.path, specifier!)
    if (!target?.startsWith('src/components/') || NOT_A_PART.test(target)) continue
    for (const raw of list!.split(',')) {
      const spec = raw.trim()
      if (!spec || spec.startsWith('type ')) continue
      names.push(spec.split(/\s+as\s+/)[0]!.trim())
    }
  }
  return [...new Set(names)]
}

/**
 * The docs pages a set of files is built from. Names with no page (an
 * internal helper, which a pattern may not import) are returned in
 * `unknown`, so a caller can decide whether that is an error.
 */
export function builtFrom(files: readonly SourceFile[], pageOf: ReadonlyMap<string, string>) {
  const titles = new Set<string>()
  const unknown = new Set<string>()
  for (const file of files) {
    for (const name of componentImports(file)) {
      const title = pageOf.get(name)
      if (title) titles.add(title)
      else unknown.add(name)
    }
  }
  return { titles: [...titles].sort(), unknown: [...unknown].sort() }
}

/**
 * The files that make up a pattern: its folder's screen files, not its
 * stories. The stories only frame the screen in the Cayuco shell, and the
 * screen is what a reader copies.
 */
export function compositionFiles(siblings: readonly string[]) {
  return siblings.filter((path) => /\.tsx?$/.test(path) && !/\.(stories|test)\.tsx?$/.test(path)).sort()
}
