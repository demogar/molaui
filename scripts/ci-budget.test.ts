// @vitest-environment node
import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../src/test/found'
import runs from './fixtures/ci-runs.json'
// @ts-expect-error -- a plain .mjs script with no declaration file
import { BUDGET_SECONDS, judge } from './ci-budget.mjs'

/**
 * The fixtures are two real runs of ci.yml, trimmed to names and times: one
 * from before the browser jobs were sharded (#32), when the audit alone took
 * almost eight minutes, and one sharded run. The check must tell them apart.
 */
describe('ci budget', () => {
  it('fails the unsharded run, which took about eight minutes', () => {
    const result = judge(runs.beforeSharding.jobs)
    expect(result.ok).toBe(false)
    expect(result.wall).toBeGreaterThan(BUDGET_SECONDS)
  })

  it('passes the sharded run and reports each shard group', () => {
    const result = judge(runs.sharded.jobs)
    expect(result.ok).toBe(true)
    expect(result.wall).toBeLessThanOrEqual(BUDGET_SECONDS)
    expect(result.shards.map((s: { name: string; count: number }) => [s.name, s.count]).sort()).toEqual([
      ['Browser audit', 4],
      ['Visual regression', 4],
    ])
  })

  it('compares shards by their longest step and warns on a wide spread', () => {
    // That run's audit shards ran their tests in 53s to 88s: an uneven split.
    const result = judge(runs.sharded.jobs)
    const audit = result.shards.find((s: { name: string }) => s.name === 'Browser audit')
    expect(audit).toMatchObject({ fastest: 53, slowest: 88 })
    expect(result.warnings.join('\n')).toMatch(/Browser audit: shards differ by 35s/)
  })

  it('keeps the visual baselines under the size where LFS is worth revisiting', () => {
    // CONTRIBUTING.md, "Visual baselines": plain files while the set is small;
    // past 50 MB the trade-off against LFS changes, so it fails to ask again.
    const dir = resolve(import.meta.dirname, '../test/visual/__screenshots__/linux')
    const bytes = found(readdirSync(dir), 100, 'visual baselines').reduce((sum, f) => sum + statSync(resolve(dir, f)).size, 0)
    expect(bytes).toBeLessThan(50 * 1024 * 1024)
  })

  it('ignores its own job, unfinished jobs and skipped ones', () => {
    const t = (s: number) => new Date(Date.UTC(2026, 9, 14, 12, 0, s)).toISOString()
    const job = (name: string, from: number, to: number | null, conclusion: string | null = 'success') => ({
      name,
      status: to === null ? 'in_progress' : 'completed',
      conclusion,
      startedAt: t(from),
      completedAt: to === null ? null : t(to),
    })
    const result = judge([job('Gates', 0, 50), job('CI budget', 0, 59 * 9), job('Later', 10, null), job('Publish', 0, 59 * 9, 'skipped')])
    expect(result.wall).toBe(50)
    expect(result.ok).toBe(true)
  })
})
