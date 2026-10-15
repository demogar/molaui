// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../src/test/found'
import runs from './fixtures/ci-runs.json'
// @ts-expect-error -- a plain .mjs script with no declaration file
import { BUDGET_SECONDS, judge, parseGraph } from './ci-budget.mjs'

type Job = { name: string; status: string; conclusion: string | null; startedAt: string; completedAt: string | null }

const graph = parseGraph(readFileSync(resolve(import.meta.dirname, '../.github/workflows/ci.yml'), 'utf8'))
const at = (iso: string, seconds: number) => new Date(Date.parse(iso) + seconds * 1000).toISOString().replace('.000', '')

/**
 * The fixtures are two real runs of ci.yml, trimmed to names and times: one
 * from before the browser jobs were sharded (#32), when the audit alone took
 * almost eight minutes, and one sharded run. The check must tell them apart,
 * and must not count a job's wait for a runner against the budget.
 */
describe('ci budget', () => {
  it('fails the unsharded run, which took about eight minutes', () => {
    const result = judge(runs.beforeSharding.jobs, { graph })
    expect(result.ok).toBe(false)
    expect(result.critical).toBeGreaterThan(BUDGET_SECONDS)
    expect(result.path).toEqual(['Browser audit', 'Publish Storybook'])
  })

  it('passes the sharded run and reports each shard group', () => {
    const result = judge(runs.sharded.jobs, { graph })
    expect(result.ok).toBe(true)
    expect(result.critical).toBeLessThanOrEqual(BUDGET_SECONDS)
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

  it('reads the job graph from ci.yml', () => {
    const needs = Object.fromEntries(graph.map((g: { key: string; needs: string[] }) => [g.key, g.needs]))
    expect(needs).toMatchObject({ gates: [], audit: ['audit-shard'], visual: ['visual-shard'], budget: ['gates', 'audit', 'visual', 'consumers'] })
    expect(parseGraph('jobs:\n  a:\n    name: "A"\n  b:\n    needs:\n      - a\n    steps:\n      - run: x\n')).toEqual([
      { key: 'a', name: 'A', needs: [] },
      { key: 'b', name: 'b', needs: ['a'] },
    ])
  })

  it('follows the longest chain of needs: the slowest shard, then its summary', () => {
    // Visual regression (4/4) ran 162s, its summary job 4s after it.
    const result = judge(runs.sharded.jobs, { graph })
    expect(result.critical).toBe(166)
    expect(result.path).toEqual(['Visual regression (4/4)', 'Visual regression'])
  })

  it('leaves out a summary job waiting for a runner (#140)', () => {
    // The sharded run again, with its Visual regression summary queued 100s
    // after the shards finished, as on #140: every job took its usual time,
    // and only first-start-to-last-end grows past the budget.
    const jobs = (runs.sharded.jobs as Job[]).map((j) =>
      j.name === 'Visual regression' ? { ...j, startedAt: at(j.startedAt, 100), completedAt: at(j.completedAt!, 100) } : j,
    )
    const result = judge(jobs, { graph })
    expect(result.wall).toBeGreaterThan(BUDGET_SECONDS)
    expect(result.critical).toBe(166)
    expect(result.ok).toBe(true)
  })

  it('still counts a job that runs long after its needs', () => {
    const t = (s: number) => at('2026-10-14T12:00:00Z', s)
    const job = (name: string, from: number, to: number) => ({ name, status: 'completed', conclusion: 'success', startedAt: t(from), completedAt: t(to) })
    // Gates 100s, then a summary that queued 50s and ran 200s: 300s of execution.
    const result = judge([job('Gates', 0, 100), job('CI budget', 0, 999), job('Publish Storybook', 150, 350)], {
      graph: parseGraph('jobs:\n  gates:\n    name: Gates\n  deploy:\n    name: Publish Storybook\n    needs: gates\n'),
    })
    expect(result.critical).toBe(300)
    expect(result.ok).toBe(false)
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
    expect(result.critical).toBe(50)
    expect(result.ok).toBe(true)
  })
})
