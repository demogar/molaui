// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The browser floor is said twice: as `BROWSER_FLOOR` in vite.config.ts, which
 * is what Lightning CSS builds dist/mola-ui.css (and, through
 * vite.css.config.ts, dist/mola-ui-components.css) for, and in the README, which
 * is what a consumer reads. Without the build setting the CSS target followed
 * the JS target (es2022), and every light-dark() pair shipped lowered into
 * variable pairs for browsers that cannot run the system. Read as text rather
 * than imported, because importing the config loads every build plugin.
 */
const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const NAMES: Record<string, string> = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', safari: 'Safari' }

describe('browser floor', () => {
  const config = read('vite.config.ts')
  const floor = [...(/BROWSER_FLOOR = \[([^\]]+)\]/.exec(config)?.[1] ?? '').matchAll(/'([a-z]+)([\d.]+)'/g)].map((m) => ({
    browser: m[1]!,
    version: m[2]!,
  }))

  it('builds both stylesheets for the floor', () => {
    expect(floor.length).toBeGreaterThan(0)
    expect(config).toMatch(/cssTarget: \[\.\.\.BROWSER_FLOOR\]/)
    // dist/mola-ui-components.css has a build of its own.
    expect(read('vite.css.config.ts')).toMatch(/cssTarget: \[\.\.\.BROWSER_FLOOR\]/)
  })

  it('states the same floor in the README', () => {
    const line = /\*\*Browser support:\*\*([^\n]+)/.exec(read('README.md'))?.[1] ?? ''
    for (const { browser, version } of floor) expect(line).toContain(`${NAMES[browser]} ${version}`)
  })
})
