// Browser audit over every story and every docs page: axe (with real colour
// contrast) in both themes, horizontal overflow at phone width, and console
// errors. Exits non-zero on any finding, so CI can gate on it.
//   node scripts/audit.mjs <base> [--out <dir>] [--only <id substring>] [--workers <n>]
//
// Run it against a static build (`npm run build-storybook`, then
// `node scripts/serve-static.mjs`), not the dev server: the dev server
// compiles each story on first request and keeps sockets open, and the audit
// once stalled for minutes on a single story waiting for `networkidle`. Each
// page now waits for Storybook to say it has rendered rather than for the
// network to go quiet, and has its own time limit, so one bad story is
// reported as a failure instead of hanging the run.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args.splice(i, 2)[1]
}
const outDir = flag('--out')
const only = flag('--only')
const workers = Number(flag('--workers', 4))
const base = args[0] ?? 'http://localhost:6006'
const PAGE_TIMEOUT = 45_000

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const index = await (await fetch(`${base}/index.json`)).json()
const entries = Object.values(index.entries).filter((e) => !only || e.id.includes(only))
const stories = entries.filter((e) => e.type === 'story')
const docs = entries.filter((e) => e.type === 'docs')

/** One unit of work: a page, in a theme, at a width, with a set of checks. */
const jobs = []
for (const theme of ['light', 'dark']) {
  for (const s of stories) jobs.push({ id: s.id, viewMode: 'story', theme, width: 1280, axe: true })
  // On a docs page the chrome stays light, but every example frame follows
  // the theme global, so both themes are audited there too.
  for (const d of docs) jobs.push({ id: d.id, viewMode: 'docs', theme, width: 1280, axe: true })
}
for (const s of stories) jobs.push({ id: s.id, viewMode: 'story', theme: 'light', width: 390, overflow: true })
for (const d of docs) jobs.push({ id: d.id, viewMode: 'docs', theme: 'light', width: 390, overflow: true })

const IGNORED_CONSOLE = [
  /Download the React DevTools/,
  /favicon/,
  // Chromium's own note when the settings-page pattern's unsaved-changes
  // guard meets the audit navigating away; it is logged against whichever
  // page loads next, and it is the guard working, not an error.
  /Blocked attempt to show multiple 'beforeunload' confirmation panels/,
]

async function audit(page, job, errors) {
  const url = `${base}/iframe.html?id=${job.id}&viewMode=${job.viewMode}&globals=theme:${job.theme}`
  await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT })
  // Storybook marks <body> once the story or docs page has rendered (or
  // failed to). That, plus the fonts, is what "ready" means here.
  await page.waitForFunction(
    () => /sb-show-(main|errordisplay|nopreview)/.test(document.body.className),
    undefined,
    { timeout: PAGE_TIMEOUT },
  )
  const shown = await page.evaluate(() => document.body.className)
  if (!shown.includes('sb-show-main')) return [`did not render (${shown.trim()})`]
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)

  const found = []
  if (job.axe) {
    await page.addScriptTag({ content: axeSource })
    found.push(
      ...(await page.evaluate(async (docs) => {
        const rules = {
          region: { enabled: false },
          'landmark-one-main': { enabled: false },
          'page-has-heading-one': { enabled: false },
        }
        // A docs page stacks several complete examples, so a page header or
        // an accordion appears once per story: their landmarks repeat and
        // their headings follow Storybook's own. Uniqueness and order across
        // examples means nothing to a reader, and every story is audited for
        // these rules on its own page above.
        if (docs) {
          for (const id of [
            'landmark-unique',
            'landmark-no-duplicate-banner',
            'landmark-no-duplicate-contentinfo',
            'landmark-no-duplicate-main',
            'heading-order',
            // Storybook's preview frame is `overflow: auto`, and a sub-pixel
            // of rounding makes axe count it as a scroll region. The story
            // pages audit the components' own scroll regions.
            'scrollable-region-focusable',
          ])
            rules[id] = { enabled: false }
        }
        // The args table is Storybook's control editor, not documentation:
        // its object editor nests bare <li>s and its boolean toggle dims the
        // unselected word. Everything else on the page is audited.
        // Seen twice in a thousand pages: axe reports a run still in flight
        // on a freshly loaded document. Waiting for it is enough.
        while (window.axe._running) await new Promise((resolve) => setTimeout(resolve, 100))
        const r = await window.axe.run(
          docs ? { include: ['#storybook-docs'], exclude: ['.docblock-argstable'] } : '#storybook-root',
          { rules },
        )
        // Base UI's focus guards are tabbable, aria-hidden sentinels that keep
        // focus inside an open menu or dialog. axe cannot know they are
        // sentinels; the components' keyboard tests prove the trap works.
        const isGuard = (n) => n.target.join(' ').includes('data-base-ui-focus-guard')
        return r.violations
          .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !isGuard(n)) }))
          .filter((v) => v.nodes.length > 0)
          .map(
            (v) =>
              `${v.id} ×${v.nodes.length}: ${v.nodes
                .slice(0, 2)
                .map((n) => n.target.join(' ') + ' — ' + (n.failureSummary ?? '').split('\n')[1])
                .join(' | ')}`,
          )
      }, job.viewMode === 'docs')),
    )
  }
  if (job.overflow) {
    // The args table is a fixed-width grid Storybook does not lay out for a
    // phone, so it is set aside for the measurement; the examples, prose and
    // doc blocks around it must still fit.
    const over = await page.evaluate(() => {
      for (const t of document.querySelectorAll('.docblock-argstable')) t.style.display = 'none'
      return document.documentElement.scrollWidth - window.innerWidth
    })
    if (over > 1) found.push(`overflows by ${over}px`)
  }
  for (const e of errors) {
    if (IGNORED_CONSOLE.some((re) => re.test(e))) continue
    // The broken-image story points at a host that does not resolve, on
    // purpose, and the avatar docs page renders that story too.
    const brokenImage = job.id.includes('broken-image') || job.id === 'components-data-display-avatar--overview'
    if (brokenImage && /ERR_NAME_NOT_RESOLVED/.test(e)) continue
    found.push(`console: ${e.slice(0, 200)}`)
  }
  return found
}

const browser = await chromium.launch()
const failures = []
let done = 0
const started = Date.now()

async function worker(queue) {
  let page
  let errors = []
  const fresh = async (width) => {
    await page?.close().catch(() => {})
    page = await browser.newPage({ viewport: { width, height: 900 } })
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    // The settings-page pattern guards unsaved changes with `beforeunload`.
    // Playwright dismisses dialogs by default, which keeps the page and makes
    // Chromium log an error against the next story; leaving is what we want.
    page.on('dialog', (d) => d.accept().catch(() => {}))
  }
  for (let job = queue.shift(); job; job = queue.shift()) {
    if (!page || page.viewportSize().width !== job.width) await fresh(job.width)
    errors = []
    let timer
    const limit = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${PAGE_TIMEOUT / 1000}s`)), PAGE_TIMEOUT + 5_000)
    })
    try {
      const found = await Promise.race([audit(page, job, errors), limit])
      for (const f of found) failures.push({ ...job, finding: f })
    } catch (e) {
      failures.push({ ...job, finding: String(e.message ?? e).split('\n')[0] })
      // A page that timed out may still be busy; never reuse it.
      await fresh(job.width)
    } finally {
      clearTimeout(timer)
    }
    done++
    if (done % 100 === 0) console.log(`  ${done}/${jobs.length} pages`)
  }
  await page?.close().catch(() => {})
}

const queue = [...jobs]
await Promise.all(Array.from({ length: workers }, () => worker(queue)))
await browser.close()

const label = (f) => `[${f.width === 390 ? '390px' : f.theme}] ${f.viewMode === 'docs' ? 'docs ' : ''}${f.id}: ${f.finding}`
const lines = failures.map(label).sort()
const seconds = Math.round((Date.now() - started) / 1000)
const summary = `${stories.length} stories and ${docs.length} docs pages audited (${jobs.length} page loads, ${seconds}s): ${
  failures.length ? `${failures.length} findings` : 'CLEAN'
}`
console.log(summary)
if (lines.length) console.log(lines.join('\n'))

if (outDir) {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'audit.json'), JSON.stringify({ summary, stories: stories.length, docs: docs.length, failures }, null, 2))
  writeFileSync(join(outDir, 'audit.md'), `# Browser audit\n\n${summary}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`)
}
process.exit(failures.length ? 1 : 0)
