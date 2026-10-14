import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { decide, type WorkflowRun } from './require-ci'

const sha = 'a'.repeat(40)
const other = 'b'.repeat(40)
const limits = { appearMs: 5 * 60_000, timeoutMs: 40 * 60_000 }

function run(overrides: Partial<WorkflowRun>): WorkflowRun {
  return {
    id: 1,
    head_sha: sha,
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    html_url: 'https://github.com/demogar/molaui/actions/runs/1',
    ...overrides,
  }
}

describe('decide', () => {
  it('passes a commit with a successful ci.yml run', () => {
    expect(decide([run({})], sha, 0, limits).kind).toBe('pass')
  })

  it('passes when a re-run went green next to a failed run', () => {
    const runs = [run({ id: 1, conclusion: 'failure' }), run({ id: 2 })]
    expect(decide(runs, sha, 0, limits).kind).toBe('pass')
  })

  it('ignores a green run on a different commit', () => {
    expect(decide([run({ head_sha: other })], sha, 0, limits).kind).toBe('wait')
    expect(decide([run({ head_sha: other })], sha, limits.appearMs, limits).kind).toBe('fail')
  })

  it('waits for a run that has not appeared yet, then fails', () => {
    expect(decide([], sha, 0, limits).kind).toBe('wait')
    expect(decide([], sha, limits.appearMs, limits).kind).toBe('fail')
  })

  it('waits for a run in progress, then fails at the timeout', () => {
    const runs = [run({ status: 'in_progress', conclusion: null })]
    expect(decide(runs, sha, limits.appearMs + 1, limits).kind).toBe('wait')
    expect(decide(runs, sha, limits.timeoutMs, limits).kind).toBe('fail')
  })

  it.each(['failure', 'cancelled', 'timed_out', 'action_required', 'skipped', 'startup_failure'])(
    'refuses a run that concluded %s',
    (conclusion) => {
      const verdict = decide([run({ conclusion })], sha, 0, limits)
      expect(verdict.kind).toBe('fail')
      expect(verdict.reason).toContain(conclusion)
    },
  )
})

/**
 * The function above is only a gate if the publish job calls it before it
 * publishes, with permission to read the runs. Read the workflow as text: one
 * job's step order is all this needs to hold.
 */
describe('release-please.yml publish job', () => {
  const workflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/release-please.yml'), 'utf8')
  const publish = workflow.slice(workflow.indexOf('\n  publish:'))

  it('can read workflow runs', () => {
    expect(publish).toMatch(/permissions:[\s\S]*?\n\s+actions: read/)
  })

  it('requires green CI before every npm publish', () => {
    const gate = publish.indexOf('scripts/require-ci.ts')
    expect(gate).toBeGreaterThan(-1)
    const publishes = [...publish.matchAll(/npm publish/g)].map((m) => m.index)
    expect(publishes.length).toBeGreaterThan(0)
    for (const at of publishes) expect(at).toBeGreaterThan(gate)
  })
})
