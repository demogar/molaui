/**
 * Warn, once, that something a consumer uses is deprecated.
 *
 * The policy (Mola UI / Versioning) is: deprecate in a minor, remove in the
 * next major. A deprecation that only lives in the changelog is one nobody
 * reads, so the old prop or name keeps working and says so in the console, in
 * development only, with what to use instead and when it goes.
 *
 * `process.env.NODE_ENV` is left for the consumer's bundler to replace, as
 * React does, so the warning and its strings drop out of a production build.
 * Read through `typeof process` because a page that loads the ESM build with
 * no bundler has no `process` at all, and a warning must never throw.
 *
 * Once per `id` and not once per render: a deprecated prop on a table row
 * would otherwise print a thousand times and bury the console.
 */
const warned = new Set<string>()

// Declared here rather than taken from @types/node, which the library's own
// type build does not load: a module-scoped declaration emits nothing and
// leaves the literal `process.env.NODE_ENV` for the bundler to replace.
declare const process: { env: { NODE_ENV?: string } } | undefined

function isProduction() {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
}

export interface Deprecation {
  /** What is deprecated, as the consumer wrote it: "<Badge tone=\"warning\">". */
  what: string
  /** What to write instead. */
  instead: string
  /** The major version that removes it: "1.0.0". */
  removal: string
}

export function deprecate(id: string, { what, instead, removal }: Deprecation) {
  if (isProduction() || warned.has(id)) return
  warned.add(id)
  console.warn(`[mola-ui] ${what} is deprecated and will be removed in ${removal}. Use ${instead} instead.`)
}

/** Tests only: forget which deprecations have already warned. */
export function resetDeprecations() {
  warned.clear()
}
