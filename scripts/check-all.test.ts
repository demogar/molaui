import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { found } from '../src/test/found'

/**
 * `npm run check:all` is the local readiness bar, so it must run everything a
 * pull request needs to merge. `npm run check` alone matched only the `Gates`
 * job, while the ruleset also requires `Browser audit`, `Visual regression`
 * and `Consumer smoke tests`; 3 of 7 failed pull request runs before this test
 * failed on a visual shard after `check` had passed locally.
 *
 * The test reads the requirement from its sources instead of restating it:
 * the required check names from .github/rulesets/main.json, the job with each
 * name in ci.yml (following `needs`, because the required "Browser audit" and
 * "Visual regression" jobs only collect their shards' results), and every
 * `npm run` those jobs execute. Each of those scripts must be reached from
 * `check:all` through package.json. A new required job, or a new step in one,
 * fails here until the script covers it.
 */

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

interface Job {
  name: string
  needs: string[]
  runs: string[]
}

/**
 * A reader for the jobs block of a GitHub Actions workflow, enough for job
 * ids, `name`, `needs` and `run` lines. A YAML library would be sturdier, but
 * the repo has none as a direct dependency and adding one for a single test
 * was not worth it; the workflows use the plain two-space shape GitHub's own
 * examples use, and the assertions below fail loudly if this finds nothing.
 */
function readJobs(source: string): Map<string, Job> {
  const jobs = new Map<string, Job>()
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line === 'jobs:')
  let current: Job | undefined
  for (const line of lines.slice(start + 1)) {
    const id = /^ {2}([\w-]+):\s*$/.exec(line)?.[1]
    if (id) {
      current = { name: id, needs: [], runs: [] }
      jobs.set(id, current)
      continue
    }
    if (!current) continue
    const name = /^ {4}name:\s*(.+?)\s*$/.exec(line)?.[1]
    if (name) current.name = name.replace(/^['"]|['"]$/g, '')
    const needs = /^ {4}needs:\s*(.+?)\s*$/.exec(line)?.[1]
    if (needs) current.needs = needs.replace(/[[\]]/g, '').split(',').map((need) => need.trim()).filter(Boolean)
    const run = /^\s+(?:- )?run:\s*(.+?)\s*$/.exec(line)?.[1]
    if (run) current.runs.push(run)
  }
  return jobs
}

/** The npm scripts a shell command runs: `npm run <name>` and `npm test`. */
function npmScripts(command: string): string[] {
  return [...command.matchAll(/\bnpm (?:run ([\w:-]+)|(test)\b)/g)].map((m) => (m[1] ?? m[2]) as string)
}

const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts
const ruleset = JSON.parse(read('.github/rulesets/main.json')) as {
  rules: { type: string; parameters?: { required_status_checks?: { context: string }[] } }[]
}
const required = ruleset.rules
  .flatMap((rule) => (rule.type === 'required_status_checks' ? (rule.parameters?.required_status_checks ?? []) : []))
  .map((check) => check.context)
const ci = readJobs(read('.github/workflows/ci.yml'))

/** Every script `name` runs, itself included, following nested `npm run`s. */
function reach(name: string, seen = new Set<string>()): Set<string> {
  if (seen.has(name)) return seen
  seen.add(name)
  for (const next of npmScripts(scripts[name] ?? '')) reach(next, seen)
  return seen
}

/** The npm scripts a ci.yml job runs, with those of the jobs it needs. */
function jobScripts(id: string, seen = new Set<string>()): string[] {
  if (seen.has(id)) return []
  seen.add(id)
  const job = ci.get(id)
  if (!job) return []
  return [...job.runs.flatMap(npmScripts), ...job.needs.flatMap((need) => jobScripts(need, seen))]
}

describe('check:all covers every required CI job', () => {
  it('finds the required checks and the ci.yml jobs', () => {
    expect(required.length).toBeGreaterThan(0)
    expect(ci.size).toBeGreaterThan(0)
  })

  it('defines check:all', () => {
    expect(scripts['check:all']).toBeDefined()
  })

  const local = reach('check:all')
  const inCi = required.filter((context) => [...ci.values()].some((job) => job.name === context))

  it.each(inCi)('runs every npm script of the required job "%s"', (context) => {
    const id = [...ci.entries()].find(([, job]) => job.name === context)?.[0] as string
    const needed = jobScripts(id)
    expect(needed.length, `no npm scripts found for "${context}"; did the reader break?`).toBeGreaterThan(0)
    for (const script of needed) {
      expect(scripts[script], `ci.yml runs a script package.json lacks: ${script}`).toBeDefined()
      expect(local.has(script), `check:all does not run "${script}", which "${context}" needs`).toBe(true)
    }
  })

  // A required check outside ci.yml (the PR title check) has nothing to run
  // locally, but it must exist somewhere, or the ruleset waits on a check
  // that never reports.
  it('finds every other required check in some workflow', () => {
    const others = found(
      readdirSync(resolve(root, '.github/workflows')).filter((file) => file !== 'ci.yml' && /\.ya?ml$/.test(file)),
      1,
      'workflows besides ci.yml',
    )
      .flatMap((file) => [...readJobs(read(`.github/workflows/${file}`)).values()].map((job) => job.name))
    for (const context of required.filter((context) => !inCi.includes(context))) {
      expect(others, `no workflow defines the required check "${context}"`).toContain(context)
    }
  })
})
