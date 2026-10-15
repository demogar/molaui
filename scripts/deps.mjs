#!/usr/bin/env node
// What the published package puts on a user's machine, held to a licence
// allow-list and to `npm audit`.
//
//   node scripts/deps.mjs        # npm run deps:audit (Gates runs it)
//
// "Shipped" is three things, read from package-lock.json rather than listed:
// the runtime dependencies, the peer dependencies (an app installing the
// library installs them too, @base-ui/react included since #121), and what
// vite.mcp.config.ts bundles into the mola-ui-mcp bin (the MCP SDK and zod are
// devDependencies, so `npm audit --omit=dev` alone would never look at them,
// yet their code ships inside dist/mcp/). Each is followed through its own
// dependencies to the whole installed closure. That overstates the bin, which
// rolldown tree-shakes down to the stdio server, but deciding which advisory
// sits in the shaken-out part is a judgement, and a judgement belongs in
// ACCEPTED below with its reason, not in a filter. The ESLint plugin
// (vite.eslint.config.ts, dist/eslint/) ships too, but bundles no package:
// deps.test.ts holds its imports to Node's builtins and its own files.
//
// The licence half is offline and runs in the unit suite (scripts/deps.test.ts).
// The audit half needs the registry, so it is this script, and it has to cope
// with the registry being down without making Gates flaky: it retries, and if
// npm still returns no report because the request failed, it warns (a GitHub
// annotation on the run) and passes. A registry outage says nothing about the
// dependencies; failing on it would block every merge until npm recovers, and
// the next run audits again. Anything else that yields no report (a broken
// lockfile, an npm error) fails, so the fallback cannot hide a real fault.
import { execFile } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')

/** The packages vite.mcp.config.ts bundles into dist/mcp/ (deps.test.ts holds this to mcp/'s imports). */
export const BUNDLED = ['@modelcontextprotocol/sdk', 'zod']

/**
 * Licences a shipped package may carry: permissive ones that ask for no more
 * than keeping the notice. Copyleft of any strength, a missing licence, or
 * "SEE LICENSE IN" fails, and a new one is added here only after reading it.
 */
export const SHIPPED_LICENSES = ['MIT', 'MIT-0', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0']

/**
 * The whole tree, dev tooling included. The Storybook site that GitHub Pages
 * serves bundles some of it, so it is held too, more loosely: file-level
 * copyleft (MPL-2.0: axe-core, lightningcss) distributed unmodified, the
 * fonts' OFL-1.1, caniuse-lite's CC-BY-4.0 data and argparse's Python-2.0.
 * GPL, LGPL, AGPL and SSPL are not here: they would bind the site or the code.
 */
export const TREE_LICENSES = [...SHIPPED_LICENSES, 'MPL-2.0', 'OFL-1.1', 'CC-BY-4.0', 'Python-2.0']

/**
 * Advisories looked at and accepted for a shipped package, by GHSA id, each
 * with why it does not reach a user. Empty today.
 * @type {Record<string, string>}
 */
export const ACCEPTED = {}

/** Severities that fail the audit; lower ones on shipped packages are printed as warnings. */
export const FAILING = ['high', 'critical']

/**
 * Whether an SPDX expression is allowed: `A OR B` needs one side, `A AND B`
 * needs both. Enough for what npm puts in a lockfile; WITH exceptions and
 * nested mixes fail, to be read by a person.
 * @param {string | undefined} expression
 * @param {readonly string[]} allowed
 */
export function licenseAllowed(expression, allowed) {
  if (!expression) return false
  const bare = expression.trim().replace(/^\((.*)\)$/, '$1')
  if (/\bOR\b/.test(bare) && /\bAND\b/.test(bare)) return false
  if (/\bOR\b/.test(bare)) return bare.split(/\s+OR\s+/).some((part) => licenseAllowed(part, allowed))
  if (/\bAND\b/.test(bare)) return bare.split(/\s+AND\s+/).every((part) => licenseAllowed(part, allowed))
  return allowed.includes(bare)
}

/**
 * Lockfile paths of every installed package `names` reaches, resolved the way
 * Node does: a dependency of node_modules/a/node_modules/b is looked for in
 * b's own node_modules, then a's, then the top level.
 * @param {{ packages: Record<string, { dependencies?: Record<string, string>, optionalDependencies?: Record<string, string> }> }} lock
 * @param {readonly string[]} names
 */
export function closure(lock, names) {
  const seen = new Set()
  /** @param {string} from @param {string} name */
  const locate = (from, name) => {
    let base = from
    for (;;) {
      const candidate = `${base ? `${base}/` : ''}node_modules/${name}`
      if (lock.packages[candidate]) return candidate
      if (!base) return undefined
      const at = base.lastIndexOf('/node_modules/')
      base = at === -1 ? '' : base.slice(0, at)
    }
  }
  /** @param {string} path */
  const visit = (path) => {
    if (seen.has(path)) return
    seen.add(path)
    const entry = lock.packages[path] ?? {}
    for (const dep of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies })) {
      const found = locate(path, dep)
      if (found) visit(found)
    }
  }
  for (const name of names) {
    const found = locate('', name)
    if (!found) throw new Error(`${name} is not in package-lock.json`)
    visit(found)
  }
  return seen
}

/**
 * @param {{ packages: Record<string, any> }} lock
 * @param {{ dependencies?: Record<string, string>, peerDependencies?: Record<string, string> }} pkg
 */
export function shipped(lock, pkg) {
  return closure(lock, [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {}), ...BUNDLED])
}

/**
 * Splits an `npm audit --json` report into failures (a failing severity on a
 * shipped package, not accepted), warnings (lower severities on shipped
 * packages) and the count of dev-only findings, which never fail: dev tools
 * do not reach a user, and Dependabot raises them anyway.
 * @param {{ vulnerabilities: Record<string, { name: string, severity: string, nodes: string[], via: Array<string | { url?: string, title?: string, severity?: string }> }> }} report
 * @param {Set<string>} ships
 * @param {Record<string, string>} accepted
 */
export function judge(report, ships, accepted = ACCEPTED) {
  const failures = []
  const warnings = []
  let devOnly = 0
  for (const vuln of Object.values(report.vulnerabilities)) {
    if (!vuln.nodes.some((node) => ships.has(node))) {
      devOnly++
      continue
    }
    // A finding whose `via` names only other packages is inherited: the
    // package with the advisory is in the closure too and is reported itself.
    const open = vuln.via.filter((via) => typeof via === 'object' && !accepted[via.url?.split('/').pop() ?? ''])
    if (open.length === 0) continue
    const line = `${vuln.name} (${vuln.severity}): ${open.map((via) => `${via.title} ${via.url}`).join('; ')}`
    ;(FAILING.includes(vuln.severity) ? failures : warnings).push(line)
  }
  return { failures, warnings, devOnly }
}

/**
 * Whether npm produced no report because the registry could not be reached
 * or answered with a server error, as opposed to any other failure.
 * @param {string} output
 */
export function isRegistryFailure(output) {
  return /request to \S+ failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ENETUNREACH|socket hang up|\b50[0234]\b|audit endpoint returned an error/i.test(output)
}

/** @returns {Promise<{ report?: any, output: string }>} */
function runAudit() {
  return new Promise((done) => {
    // Not --omit=dev: the bundled SDK and zod are devDependencies; judge() filters to what ships.
    // npm's own fetch timeout is five minutes, which a stalled registry would
    // spend three times over; a healthy audit takes about two seconds.
    const options = { cwd: root, maxBuffer: 64 * 1024 * 1024, timeout: 45_000 }
    execFile('npm', ['audit', '--json'], options, (error, stdout, stderr) => {
      const output = `${stdout}\n${stderr}${error?.killed ? '\nETIMEDOUT: npm audit was stopped after 45s' : ''}`
      try {
        const report = JSON.parse(stdout)
        done(report && typeof report.vulnerabilities === 'object' ? { report, output } : { output })
      } catch {
        done({ output })
      }
    })
  })
}

const annotate = (level, message) => console.log(process.env.GITHUB_ACTIONS ? `::${level}::${message}` : `${level}: ${message}`)

async function main() {
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'))
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const ships = shipped(lock, pkg)

  let result = await runAudit()
  for (const wait of [2000, 8000]) {
    if (result.report || !isRegistryFailure(result.output)) break
    console.log(`npm audit could not reach the registry; retrying in ${wait / 1000}s`)
    await new Promise((later) => setTimeout(later, wait))
    result = await runAudit()
  }

  if (!result.report) {
    if (isRegistryFailure(result.output)) {
      annotate('warning', 'npm audit: the registry could not be reached after three tries; the audit was skipped for this run.')
      return 0
    }
    console.error(result.output.trim())
    annotate('error', 'npm audit returned no report, and not because of the network.')
    return 1
  }

  const { failures, warnings, devOnly } = judge(result.report, ships)
  for (const line of warnings) annotate('warning', `npm audit (shipped, below ${FAILING[0]}): ${line}`)
  for (const line of failures) annotate('error', `npm audit (shipped): ${line}`)
  const summary =
    `npm audit: ${ships.size} shipped packages, ${failures.length} failing, ${warnings.length} below ${FAILING[0]}, ` +
    `${devOnly} findings in dev tooling only (not shipped, not failing).`
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
  if (failures.length) {
    console.error('Bump the package, or, if the advisory cannot reach a user, add it to ACCEPTED in scripts/deps.mjs with why.')
    return 1
  }
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(await main())
