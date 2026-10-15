/**
 * The sentinel for a glob-driven test: returns `list` when it holds at least
 * `min` entries, and throws otherwise.
 *
 * Why: most of the suite's gates are loops over files a glob or a directory
 * walk found (every story is an axe test, every link is resolved, every
 * component file is scanned for hex, borders and physical properties). If the
 * glob stops matching (a moved folder, a renamed extension, a typo in the
 * pattern), the loop runs zero times and every one of those gates passes
 * while checking nothing. Asserting "not empty" inside one `it` was tried
 * first in a few files, but an `it.each([])` or a loop at collection time
 * reports nothing to assert on, and one test's expectation does not stop the
 * others in the file passing vacuously.
 *
 * Throwing at collection fails the whole file, before any test in it can pass
 * on an empty list. `min` is set well below today's count (a half to two thirds of it), so
 * adding or removing a few files never trips it, while a glob that matches
 * nothing, or only a stray file, always does. src/test/sentinels.test.ts
 * fails a test file that reads the filesystem without calling this.
 */
export function found<T>(list: readonly T[], min: number, what: string): T[] {
  if (min < 1) throw new Error(`found(): a minimum below 1 accepts an empty list (${what})`)
  if (list.length < min) {
    throw new Error(
      `${what}: expected at least ${min}, found ${list.length}. ` +
        'The glob or directory walk matched (almost) nothing, so the tests built on it would pass without checking anything.',
    )
  }
  return [...list]
}

/** `found()` for the record an eager `import.meta.glob` returns. */
export function foundModules<T>(modules: Record<string, T>, min: number, what: string): Record<string, T> {
  found(Object.keys(modules), min, what)
  return modules
}
