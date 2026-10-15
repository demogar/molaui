#!/usr/bin/env node
// The CI time budget (CLAUDE.md: the whole run stays within three to four
// minutes), checked by CI itself at the end of every run.
//
//   node scripts/ci-budget.mjs            # inside GitHub Actions
//   node scripts/ci-budget.mjs <run id>   # locally, through `gh api`
//
// Reads the run's jobs from the GitHub API and fails if the time from the
// first job starting to the last one finishing is over budget. Queueing before
// the first job starts is left out: it is GitHub's capacity, not this repo's
// cost, and counting it made the check fail on a busy afternoon with no change
// in the code. Shards of one job are compared by their longest step (the
// tests; setup varies by twenty seconds between identical runners), and an
// uneven split is reported as a warning rather than a failure, because a slow
// runner alone can open a gap of forty seconds on the same split.
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const BUDGET_SECONDS = 240
export const SPREAD_WARNING_SECONDS = 30

const seconds = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 1000)
const finished = (x) => x.status === 'completed' && x.conclusion !== 'skipped' && x.startedAt && x.completedAt

/**
 * @param {Array<{ name: string, status: string, conclusion: string | null, startedAt: string, completedAt: string | null,
 *   steps?: Array<{ name: string, status: string, conclusion: string | null, startedAt: string | null, completedAt: string | null }> }>} jobs
 * @param {{ budget?: number, self?: string }} [options]
 */
export function judge(jobs, { budget = BUDGET_SECONDS, self = 'CI budget' } = {}) {
  const done = jobs.filter((j) => j.name !== self && finished(j))
  if (done.length === 0) return { ok: true, wall: 0, budget, jobs: [], shards: [], warnings: [] }
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
  return { ok: wall <= budget, wall, budget, jobs: rows, shards, warnings }
}

export function report(result) {
  const lines = [
    `## CI budget: ${result.ok ? 'within' : 'OVER'} ${result.budget}s`,
    '',
    `First job start to last job end: **${result.wall}s** (queueing before the first job is not counted).`,
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
  const result = judge(jobs.map((j) => ({ ...camel(j), steps: (j.steps ?? []).map(camel) })))
  const text = report(result)
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
  for (const w of result.warnings) console.log(process.env.GITHUB_ACTIONS ? `::warning::${w}` : `warning: ${w}`)
  if (!result.ok) {
    const msg = `CI took ${result.wall}s from first job start to last job end, over the ${result.budget}s budget in CLAUDE.md`
    console.log(process.env.GITHUB_ACTIONS ? `::error::${msg}` : msg)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
