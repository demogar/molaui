import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The Dependabot API-report workflow is allowed to do one thing: commit a
 * regenerated etc/mola-ui.api.md to Dependabot's branch. A workflow with a
 * write token on a branch of freshly bumped third-party code is exactly what
 * should not quietly grow, so its limits are checked here, together with the
 * other half of the bargain: `api:check` stays a required step of Gates.
 *
 * Read as text: there is no YAML parser among the repo's own dependencies,
 * and each job is a top-level block under `jobs:` with fixed indentation.
 */
const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const workflowPath = '.github/workflows/dependabot-api-report.yml'

function job(text: string, id: string): string {
  const start = text.indexOf(`\n  ${id}:\n`)
  expect(start, `job "${id}"`).toBeGreaterThan(-1)
  const rest = text.slice(start + 1)
  const next = rest.slice(1).search(/\n {2}[\w-]+:\n/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

describe('Dependabot API report workflow', () => {
  it('exists and runs only for Dependabot on its own branches', () => {
    expect(existsSync(resolve(root, workflowPath))).toBe(true)
    const text = read(workflowPath)
    expect(text).toMatch(/push:\s*\n\s*branches: \['dependabot\/npm_and_yarn\/\*\*'\]/)
    expect(text).toMatch(/^permissions: \{\}$/m)
    expect(job(text, 'regenerate')).toContain("if: github.actor == 'dependabot[bot]'")
  })

  it('builds the new dependencies with a read-only token', () => {
    const regenerate = job(read(workflowPath), 'regenerate')
    expect(regenerate).toMatch(/permissions:\n\s+contents: read\n\s+outputs:/)
    expect(regenerate).not.toMatch(/write/)
    expect(regenerate).toContain('npm run api')
  })

  it('writes with a job that runs none of their code and commits the report alone', () => {
    const commit = job(read(workflowPath), 'commit')
    expect(commit).not.toMatch(/npm (ci|install|run)|npx |setup/)
    const adds = [...commit.matchAll(/git add [^\n]*/g)].map((m) => m[0])
    expect(adds).toEqual(['git add etc/mola-ui.api.md'])
    expect(commit).toContain('"$(git status --porcelain)" != " M etc/mola-ui.api.md"')
  })

  it('leaves api:check a required step of Gates', () => {
    const gates = job(read('.github/workflows/ci.yml'), 'gates')
    expect(gates).toContain('name: Gates')
    expect(gates).toContain('- run: npm run api:check')
    const ruleset = JSON.parse(read('.github/rulesets/main.json')) as {
      rules: { type: string; parameters?: { required_status_checks?: { context: string }[] } }[]
    }
    const required = ruleset.rules.flatMap((r) => r.parameters?.required_status_checks ?? []).map((c) => c.context)
    expect(required).toContain('Gates')
  })
})
