// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The script the `Conventional PR title` workflow runs on plain Node, with no
 * node_modules: it must load changes.ts through type stripping and exit
 * non-zero on an unknown scope. The rules themselves are tested next to the
 * tables, in src/docs/usage/changes.test.ts.
 */
const script = resolve(import.meta.dirname, 'pr-scope.mjs')
const run = (title: string) =>
  spawnSync(process.execPath, ['--no-warnings', script, title], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '' } })

describe('pr-scope.mjs', () => {
  it('passes a declared scope and a title with none', () => {
    expect(run('feat(button): add a size').status).toBe(0)
    expect(run('docs: fix a typo').status).toBe(0)
  })

  it('fails an unknown scope and says where to declare it', () => {
    const result = run('feat(widget): add a widget')
    expect(result.status).toBe(1)
    expect(result.stdout).toMatch(/Unknown scope "widget".*src\/docs\/usage\/changes\.ts/)
  })

  it('runs in the required PR-title job, on the title from the environment', () => {
    const workflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/pr-title.yml'), 'utf8')
    expect(workflow).toMatch(/name: Conventional PR title/)
    expect(workflow).toMatch(/run: node scripts\/pr-scope\.mjs "\$TITLE"/)
    expect(workflow).toMatch(/TITLE: \$\{\{ github\.event\.pull_request\.title \}\}/)
  })
})
