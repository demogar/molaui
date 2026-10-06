import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * A module that calls a React hook or creates a context starts with
 * `'use client'`, so the package works from a React Server Component.
 *
 * Before this test, 18 modules had no directive. Rendering one of them from a
 * server page (Stat, Table, the AI components) failed, because `useState`
 * and `useContext` do not exist in the react-server build, and worse, a
 * module-level `React.createContext()` (Stat had one) threw as soon as the
 * module was evaluated, so a server page that imported the package namespace
 * failed even without rendering Stat. Named imports hid it: the package
 * marks its JS free of side effects, so the bundler dropped the unused
 * modules. The directive makes the module a client reference instead of
 * running it on the server.
 *
 * The rule is "calls a hook", not "calls a client-only hook". `useId` and
 * `useMemo` do exist on the server, so Callout and FileDiff would survive
 * unmarked, but a rule that needs the react-server export list to apply is a
 * rule nobody applies. A hook-only module (`use-elapsed.ts`) is marked too:
 * it is only ever imported by client modules, where the directive is inert.
 *
 * This checks the source. That the directive survives the library build
 * (rolldown keeps a module's directives under `preserveModules`) is proved by
 * the Next.js fixture in test/consumers, whose page is a server component.
 */
const root = resolve(import.meta.dirname, '..')

const HOOK_CALL = /(?<![\w.])(?:React\.)?(?:use[A-Z]\w*|createContext)\(/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
  })
}

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe("'use client'", () => {
  it('every library module that calls a hook or creates a context declares it', () => {
    const missing = [join(root, 'components'), join(root, 'lib')]
      .flatMap(walk)
      .filter((file) => {
        const code = stripComments(readFileSync(file, 'utf8')).trimStart()
        return HOOK_CALL.test(code) && !/^['"]use client['"]/.test(code)
      })
      .map((file) => relative(root, file))
    expect(missing).toEqual([])
  })
})
