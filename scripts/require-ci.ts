/**
 * Refuses to let the release workflow publish a commit that CI has not passed.
 *
 *   npx tsx scripts/require-ci.ts <sha>
 *
 * Why this exists: the release PR is opened and updated by release-please. When
 * the `RELEASE_PLEASE_TOKEN` secret is unset it pushes with the default
 * `GITHUB_TOKEN`, and GitHub does not start workflows for those pushes, so the
 * release PR carried no checks at all and 0.5.0 and 0.6.0 were merged through
 * the ruleset bypass. The one commit that reaches npm was the only commit on
 * `main` that skipped every required job. The publish job re-ran `npm test`
 * and `npm run build`, which is a fraction of CI (no api:check, size, browser
 * audit, visual or consumer tests).
 *
 * Re-running all of CI inside the publish job was considered and rejected: it
 * would be a second copy of ci.yml that drifts. Instead this waits for the
 * real ci.yml run on the tagged commit. Merging the release PR pushes that
 * commit to `main`, which starts ci.yml (on: push) and release-please.yml at
 * the same moment, so the run is usually still going when the publish job
 * gets here: it polls until the run finishes rather than failing on "in
 * progress".
 *
 * It needs `actions: read` on the job's token. Exit code 0 means a ci.yml run
 * for this exact SHA concluded `success`; anything else fails the job before
 * `npm publish`.
 */

/** The fields of a workflow run this gate reads, as the REST API returns them. */
export interface WorkflowRun {
  id: number
  head_sha: string
  status: string | null
  conclusion: string | null
  event: string
  html_url: string
}

export interface Limits {
  /**
   * How long to wait for a ci.yml run to appear at all. GitHub creates the
   * push run within seconds, so a long silence means it will never come (a
   * `[skip ci]` commit, CI disabled), and waiting the full timeout for it
   * would only delay the failure.
   */
  appearMs: number
  /** How long to wait for a run that exists to finish. */
  timeoutMs: number
}

export type Verdict =
  | { kind: 'pass'; reason: string }
  | { kind: 'wait'; reason: string }
  | { kind: 'fail'; reason: string }

/**
 * Decides from one listing of ci.yml runs whether the commit may be published,
 * should be polled again, or must be refused. Pure, so the decision is unit
 * tested without the network.
 *
 * Any successful run for the SHA passes: a re-run that went green after a
 * flaky failure is the fix the maintainer reaches for, and GitHub keeps a
 * re-run under the same run id with the latest attempt's conclusion.
 * Runs for other SHAs are ignored even if the API returned them, because a
 * green run on a neighbouring commit says nothing about this one.
 */
export function decide(runs: readonly WorkflowRun[], sha: string, elapsedMs: number, limits: Limits): Verdict {
  const mine = runs.filter((run) => run.head_sha === sha)

  const green = mine.find((run) => run.status === 'completed' && run.conclusion === 'success')
  if (green) return { kind: 'pass', reason: `ci.yml passed for ${sha}: ${green.html_url}` }

  if (mine.length === 0) {
    if (elapsedMs < limits.appearMs) return { kind: 'wait', reason: `no ci.yml run for ${sha} yet` }
    return {
      kind: 'fail',
      reason:
        `no ci.yml run exists for ${sha} after ${Math.round(limits.appearMs / 1000)}s. ` +
        'Start one (push or re-run on main) and re-run this job; do not publish an unchecked commit.',
    }
  }

  const running = mine.filter((run) => run.status !== 'completed')
  if (running.length > 0) {
    if (elapsedMs < limits.timeoutMs) {
      return { kind: 'wait', reason: `ci.yml is ${running[0]?.status ?? 'running'} for ${sha}: ${running[0]?.html_url ?? ''}` }
    }
    return {
      kind: 'fail',
      reason: `ci.yml for ${sha} did not finish within ${Math.round(limits.timeoutMs / 60000)} minutes: ${running[0]?.html_url ?? ''}`,
    }
  }

  const outcomes = mine.map((run) => `${run.conclusion ?? 'unknown'} (${run.html_url})`).join(', ')
  return {
    kind: 'fail',
    reason:
      `ci.yml did not pass for ${sha}: ${outcomes}. ` +
      'Fix main or re-run the failed jobs until the run is green, then re-run this job.',
  }
}

async function listRuns(repo: string, token: string, sha: string): Promise<WorkflowRun[]> {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`
  const res = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}: ${await res.text()}`)
  const body = (await res.json()) as { workflow_runs: WorkflowRun[] }
  return body.workflow_runs
}

async function main(argv: string[]) {
  const sha = argv[0]
  const repo = process.env.GITHUB_REPOSITORY
  const token = process.env.GITHUB_TOKEN
  if (!sha || !/^[0-9a-f]{40}$/.test(sha) || !repo || !token) {
    console.error('usage: GITHUB_REPOSITORY=owner/repo GITHUB_TOKEN=… tsx scripts/require-ci.ts <40-char sha>')
    process.exit(2)
  }
  const limits: Limits = {
    appearMs: Number(process.env.REQUIRE_CI_APPEAR_MS ?? 5 * 60_000),
    timeoutMs: Number(process.env.REQUIRE_CI_TIMEOUT_MS ?? 40 * 60_000),
  }
  const intervalMs = Number(process.env.REQUIRE_CI_INTERVAL_MS ?? 30_000)
  const started = Date.now()

  for (;;) {
    const verdict = decide(await listRuns(repo, token, sha), sha, Date.now() - started, limits)
    console.log(`${verdict.kind}: ${verdict.reason}`)
    if (verdict.kind === 'pass') return
    if (verdict.kind === 'fail') process.exit(1)
    await new Promise((done) => setTimeout(done, intervalMs))
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
