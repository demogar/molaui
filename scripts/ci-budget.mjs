#!/usr/bin/env node
// The CI time budget (CLAUDE.md: the whole run stays within three to four
// minutes), checked by CI itself at the end of every run.
//
//   node scripts/ci-budget.mjs            # inside GitHub Actions
//   node scripts/ci-budget.mjs <run id>   # locally, through `gh api`
//
// Reads the run's jobs from the GitHub API and the job graph (`needs`) from
// ci.yml, and fails if the critical path of job execution is over budget: the
// longest chain of jobs through the graph, each counted from its own start to
// its own end. Time a job spends waiting for a runner is left out wherever it
// happens. The first version measured the first job's start to the last job's
// end; that left out queueing before the first job but not a summary job's,
// and a two-step summary that waited about 100s for a runner failed a run at
// 250s with every job at its usual time (#140, #143). Queueing is GitHub's
// capacity, not this repo's cost. Shards of one job are compared by their
// longest step (the tests; setup varies by twenty seconds between identical
// runners), and an uneven split is reported as a warning rather than a
// failure, because a slow runner alone can open a gap of forty seconds on the
// same split.
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const BUDGET_SECONDS = 240
export const SPREAD_WARNING_SECONDS = 30

const seconds = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 1000)
const finished = (x) => x.status === 'completed' && x.conclusion !== 'skipped' && x.startedAt && x.completedAt

/**
 * The jobs of a workflow file and what each needs, read with a few patterns
 * rather than a YAML parser: the budget job runs on the runner's own Node with
 * no node_modules, and ci.yml writes `name:` and `needs:` one way (four-space
 * indent, a single key or a flow list `[a, b]`; a block list is read too).
 *
 * @param {string} yaml
 * @returns {Array<{ key: string, name: string, needs: string[] }>}
 */
export function parseGraph(yaml) {
  const jobs = []
  let inJobs = false
  let job
  let blockNeeds = false
  for (const line of yaml.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inJobs = /^jobs:\s*$/.test(line)
      continue
    }
    if (!inJobs) continue
    const key = /^ {2}([\w-]+):\s*$/.exec(line)
    if (key) {
      job = { key: key[1], name: key[1], needs: [] }
      jobs.push(job)
      blockNeeds = false
      continue
    }
    if (!job) continue
    const item = /^ {6}- *([\w-]+)\s*$/.exec(line)
    if (blockNeeds && item) {
      job.needs.push(item[1])
      continue
    }
    blockNeeds = false
    const field = /^ {4}(name|needs):\s*(.*?)\s*$/.exec(line)
    if (!field) continue
    const value = field[2].replace(/^(['"])(.*)\1$/, '$2')
    if (field[1] === 'name') job.name = value
    else if (value === '') blockNeeds = true
    else job.needs = value.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
  }
  return jobs
}

/** A job's display name as a pattern: matrix expressions become wildcards, and an unnamed matrix job gets GitHub's ` (values)` suffix. */
function namePattern({ key, name }) {
  const escape = (s) => s.replace(/[.*+?^()|[\]\\{}$]/g, '\\$&')
  const body = name.split(/\$\{\{.*?\}\}/).map(escape).join('.+?')
  return new RegExp(name === key ? `^${body}(?: \\(.+\\))?$` : `^${body}$`)
}

/**
 * The longest chain through the job graph, each job counted from its start
 * to its end. A matrix job is as long as its slowest instance; a job that did
 * not run (skipped, or not yet finished) passes its needs through at no cost.
 * A job the graph does not name is treated as needing nothing.
 *
 * @returns {{ seconds: number, path: string[] }}
 */
function criticalPath(rows, graph) {
  const patterns = graph.map((g) => ({ ...g, pattern: namePattern(g) }))
  const byKey = new Map(graph.map((g) => [g.key, { needs: g.needs, rows: [] }]))
  for (const row of rows) {
    const g = patterns.find((p) => p.pattern.test(row.name))
    if (g) byKey.get(g.key).rows.push(row)
    else byKey.set(`row:${row.name}`, { needs: [], rows: [row] })
  }
  const memo = new Map()
  const finish = (key, seen = new Set()) => {
    if (memo.has(key)) return memo.get(key)
    const node = byKey.get(key)
    if (!node || seen.has(key)) return { seconds: 0, path: [] }
    seen.add(key)
    const before = node.needs.map((k) => finish(k, seen)).reduce((a, b) => (b.seconds > a.seconds ? b : a), { seconds: 0, path: [] })
    const slowest = node.rows.reduce((a, b) => (!a || b.seconds > a.seconds ? b : a), undefined)
    const result = slowest ? { seconds: before.seconds + slowest.seconds, path: [...before.path, slowest.name] } : before
    memo.set(key, result)
    return result
  }
  return [...byKey.keys()].map((k) => finish(k)).reduce((a, b) => (b.seconds > a.seconds ? b : a), { seconds: 0, path: [] })
}

/**
 * @param {Array<{ name: string, status: string, conclusion: string | null, startedAt: string, completedAt: string | null,
 *   steps?: Array<{ name: string, status: string, conclusion: string | null, startedAt: string | null, completedAt: string | null }> }>} jobs
 * @param {{ budget?: number, self?: string, graph?: Array<{ key: string, name: string, needs: string[] }> }} [options]
 *   `graph` is parseGraph(ci.yml); without it every job is taken as independent.
 */
export function judge(jobs, { budget = BUDGET_SECONDS, self = 'CI budget', graph = [] } = {}) {
  const done = jobs.filter((j) => j.name !== self && finished(j))
  if (done.length === 0) return { ok: true, critical: 0, path: [], wall: 0, budget, jobs: [], shards: [], warnings: [] }
  const start = done.map((j) => j.startedAt).sort()[0]
  const end = done.map((j) => j.completedAt).sort().at(-1)
  const wall = seconds(start, end)
  const rows = done
    .map((j) => {
      const steps = (j.steps ?? []).filter(finished).map((s) => ({ name: s.name, seconds: seconds(s.startedAt, s.completedAt) }))
      const longest = steps.reduce((a, b) => (b.seconds > a.seconds ? b : a), { name: '', seconds: 0 })
      return { name: j.name, seconds: seconds(j.startedAt, j.completedAt), longest }
    })
    .sort((a, b) => b.seconds - a.seconds)
  const groups = new Map()
  for (const row of rows) {
    const m = /^(.*) \((\d+)\/(\d+)\)$/.exec(row.name)
    if (!m) continue
    const list = groups.get(m[1]) ?? []
    list.push(row.longest.seconds)
    groups.set(m[1], list)
  }
  const shards = [...groups].map(([name, list]) => ({
    name,
    count: list.length,
    slowest: Math.max(...list),
    fastest: Math.min(...list),
    spread: Math.max(...list) - Math.min(...list),
  }))
  const warnings = shards
    .filter((s) => s.spread > SPREAD_WARNING_SECONDS)
    .map((s) => `${s.name}: shards differ by ${s.spread}s (${s.fastest}s to ${s.slowest}s); rebalance the split`)
  const { seconds: critical, path } = criticalPath(rows, graph)
  return { ok: critical <= budget, critical, path, wall, budget, jobs: rows, shards, warnings }
}

export function report(result) {
  const lines = [
    `## CI budget: ${result.ok ? 'within' : 'OVER'} ${result.budget}s`,
    '',
    `Critical path of job execution: **${result.critical}s** (${result.path.join(' → ')}). Time spent waiting for a runner is not counted.`,
    '',
    `First job start to last job end, waits included: ${result.wall}s.`,
    '',
    '| Job | Total | Longest step |',
    '| --- | ---: | --- |',
    ...result.jobs.map((j) => `| ${j.name} | ${j.seconds}s | ${j.longest.name} (${j.longest.seconds}s) |`),
  ]
  if (result.shards.length) {
    lines.push('', '| Sharded job | Shards | Fastest | Slowest | Spread |', '| --- | ---: | ---: | ---: | ---: |')
    for (const s of result.shards) lines.push(`| ${s.name} | ${s.count} | ${s.fastest}s | ${s.slowest}s | ${s.spread}s |`)
  }
  return lines.join('\n') + '\n'
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY ?? 'demogar/molaui'
  const run = process.argv[2] ?? process.env.GITHUB_RUN_ID
  if (!run) throw new Error('usage: node scripts/ci-budget.mjs <run id>')
  let jobs
  if (process.env.GITHUB_TOKEN) {
    const url = `${process.env.GITHUB_API_URL ?? 'https://api.github.com'}/repos/${repo}/actions/runs/${run}/jobs?per_page=100`
    const res = await fetch(url, { headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } })
    if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
    jobs = (await res.json()).jobs
  } else {
    jobs = JSON.parse(execFileSync('gh', ['api', `repos/${repo}/actions/runs/${run}/jobs?per_page=100`], { encoding: 'utf8' })).jobs
  }
  // The REST API spells the fields in snake case; judge() takes the
  // camel-case shape `gh run view --json jobs` prints, which the tests use.
  const camel = (x) => ({ ...x, startedAt: x.started_at ?? x.startedAt, completedAt: x.completed_at ?? x.completedAt })
  const graph = parseGraph(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../.github/workflows/ci.yml'), 'utf8'))
  const result = judge(
    jobs.map((j) => ({ ...camel(j), steps: (j.steps ?? []).map(camel) })),
    { graph },
  )
  const text = report(result)
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
  for (const w of result.warnings) console.log(process.env.GITHUB_ACTIONS ? `::warning::${w}` : `warning: ${w}`)
  if (!result.ok) {
    const msg = `CI's critical path took ${result.critical}s of job execution (${result.path.join(' → ')}), over the ${result.budget}s budget in CLAUDE.md`
    console.log(process.env.GITHUB_ACTIONS ? `::error::${msg}` : msg)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
