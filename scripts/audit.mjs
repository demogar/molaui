// Browser audit over every story and every docs page: axe (with real colour
// contrast) in both themes, that every `data-theme` subtree paints its own
// ground, a visible focus indicator on every tab stop, horizontal overflow at phone width, and console errors. Exits non-zero on any finding, so CI can gate on it.
//   node scripts/audit.mjs <base> [--out <dir>] [--only <id substring>] [--workers <n>] [--shard <i>/<n>]
//   node scripts/audit.mjs --serve storybook-static [--out <dir>]   (npm run audit)
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

import { focusScan } from './focus-scan.mjs'
import { serve } from './serve-static.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args.splice(i, 2)[1]
}
const outDir = flag('--out')
const only = flag('--only')
const workers = Number(flag('--workers', 4))
const serveDir = flag('--serve')
// CI splits the pages across runners: one runner took about seven minutes.
const [shard, shards] = flag('--shard', '1/1').split('/').map(Number)
const server = serveDir ? await serve(serveDir, 0) : null
const base = server ? `http://localhost:${server.address().port}` : (args[0] ?? 'http://localhost:6006')
const PAGE_TIMEOUT = 45_000

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const index = await (await fetch(`${base}/index.json`)).json()
const entries = Object.values(index.entries).filter((e) => !only || e.id.includes(only))
const stories = entries.filter((e) => e.type === 'story')
const docs = entries.filter((e) => e.type === 'docs')

/**
 * One unit of work: a page in a theme, with a set of checks. The phone-width
 * overflow check reuses the light page after axe by narrowing the viewport;
 * a third page load per entry, at 390px, was a third of the audit's time.
 */
const jobs = []
for (const theme of ['light', 'dark']) {
  for (const s of stories) jobs.push({ id: s.id, viewMode: 'story', theme, overflow: theme === 'light' })
  // On a docs page the chrome stays light, but every example frame follows
  // the theme global, so both themes are audited there too.
  for (const d of docs) jobs.push({ id: d.id, viewMode: 'docs', theme, overflow: theme === 'light' })
}
// Interleaved, so every shard gets its share of the heavy docs pages.
const mine = jobs.filter((_, i) => i % shards === shard - 1)
const WIDE = { width: 1280, height: 900 }
const PHONE = { width: 390, height: 900 }

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
  // failed to).
  await page.waitForFunction(
    () => /sb-show-(main|errordisplay|nopreview)/.test(document.body.className),
    undefined,
    { timeout: PAGE_TIMEOUT },
  )
  const shown = await page.evaluate(() => document.body.className)
  if (!shown.includes('sb-show-main')) return [`did not render (${shown.trim()})`]
  // `sb-show-main` arrives before React commits the story, and the theme is
  // applied by the decorator's effect after that commit. Waiting on the class
  // alone, a loaded runner sometimes ran axe on an empty #storybook-root (a
  // clean result that checked nothing), or just after the theme flipped:
  // the hunk headers in ai-change-review--diff-only were measured with their
  // `transition-colors` background still at the light value under text that
  // had already switched to dark ink. The transitions the wait below exists
  // for had not started yet when it looked for them. So "ready" is the story
  // on screen in the requested theme, as in the visual tests: the root (or a
  // portal) holds something and <html> carries the theme. A docs page sets
  // the theme on each example's frame instead, so it waits for every inline
  // example to have its frame.
  const ready = await page
    .waitForFunction(
      ({ docs, theme }) => {
        if (docs) {
          const root = document.getElementById('storybook-docs')
          if (!root || root.childElementCount === 0) return false
          // An example rendered in its own iframe (a full-screen pattern) is
          // outside this document; axe cannot reach it and its story page
          // audits it.
          return [...root.querySelectorAll('.docs-story')].every(
            (s) => s.querySelector('iframe') || s.querySelector(`[data-theme="${theme}"]`),
          )
        }
        return (
          document.documentElement.dataset.theme === theme &&
          ((document.getElementById('storybook-root')?.childElementCount ?? 0) > 0 ||
            // A story that is only a portaled dialog leaves the root empty.
            [...document.body.children].some((el) => el.hasAttribute('data-base-ui-portal') || el.querySelector('[role="dialog"]')))
        )
      },
      { docs: job.viewMode === 'docs', theme: job.theme },
      { timeout: PAGE_TIMEOUT },
    )
    .then(
      () => true,
      () => false,
    )
  if (!ready) return [`did not render in the ${job.theme} theme`]
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  // Colours ease between themes, so every finite transition and animation
  // is awaited (spinners and other infinite ones are left running). On a
  // slower CI runner axe once measured the app shell mid-transition:
  // light-theme ink on the dark ground, 1.12:1.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      ),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]),
  )

  const found = []
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
  // A `data-theme` subtree must actually re-theme. Every themed element
  // (the document, each docs example frame, each swatch half, plus one
  // probe per theme added here) gets a hidden child painted with `--cloth`;
  // all of one theme must agree, and light must differ from dark. This
  // caught tokens resolved once, on :root, by Lightning CSS's light-dark()
  // fallback, which left every nested dark frame light. axe could not see
  // it: light ink on a light ground has fine contrast.
  const theming = await page.evaluate(() => {
    const probes = ['light', 'dark'].map((theme) => {
      const el = document.createElement('div')
      el.dataset.theme = theme
      el.hidden = true
      document.body.append(el)
      return el
    })
    const seen = { light: new Set(), dark: new Set() }
    for (const host of document.querySelectorAll('[data-theme="light"], [data-theme="dark"]')) {
      const child = document.createElement('div')
      child.style.cssText = 'display:none;background-color:var(--cloth)'
      ;(host === document.documentElement ? document.body : host).append(child)
      const color = getComputedStyle(child).backgroundColor
      child.remove()
      seen[host.dataset.theme].add(color)
    }
    for (const p of probes) p.remove()
    const found = []
    for (const theme of ['light', 'dark'])
      if (seen[theme].size > 1)
        found.push(`data-theme="${theme}" subtrees disagree on --cloth: ${[...seen[theme]].join(' vs ')}`)
    const [light] = seen.light
    if (light && seen.dark.has(light))
      found.push(`a data-theme="dark" subtree paints the light --cloth (${light}): nested theming is broken`)
    return found
  })
  found.push(...theming)
  // Every tab stop must look different focused (scripts/focus-scan.mjs). On
  // story pages only: a docs page repeats its stories' examples.
  if (job.viewMode === 'story') found.push(...(await focusScan(page)))
  if (job.overflow) {
    // Last, because it changes the page. The args table is a fixed-width grid
    // Storybook does not lay out for a phone, so it is set aside for the
    // measurement; the examples, prose and doc blocks around it must still
    // fit. Two frames let resize listeners and observers re-render first.
    await page.setViewportSize(PHONE)
    const over = await page.evaluate(async () => {
      for (const t of document.querySelectorAll('.docblock-argstable')) t.style.display = 'none'
      for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
      return document.documentElement.scrollWidth - window.innerWidth
    })
    if (over > 1) found.push(`[390px] overflows by ${over}px`)
  }
  for (const e of errors) {
    if (IGNORED_CONSOLE.some((re) => re.test(e))) continue
    if (loadsBrokenImage(job) && /ERR_NAME_NOT_RESOLVED/.test(e)) continue
    found.push(`console: ${e.slice(0, 200)}`)
  }
  return found
}

// The broken-image story points at a host that does not resolve, on purpose,
// and the avatar docs page renders that story too.
const loadsBrokenImage = (job) => job.id.includes('broken-image') || job.id === 'components-data-display-avatar--overview'

const browser = await chromium.launch()
const failures = []
// How long each page took, so the shard split can be checked against real
// costs (written to audit.json, slowest first).
const timings = []
let done = 0
const started = Date.now()

async function worker(queue) {
  let page
  let errors = []
  const fresh = async () => {
    await page?.close().catch(() => {})
    page = await browser.newPage({ viewport: WIDE })
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    // The settings-page pattern guards unsaved changes with `beforeunload`.
    // Playwright dismisses dialogs by default, which keeps the page and makes
    // Chromium log an error against the next story; leaving is what we want.
    page.on('dialog', (d) => d.accept().catch(() => {}))
  }
  for (let job = queue.shift(); job; job = queue.shift()) {
    if (!page) await fresh()
    else if (page.viewportSize().width !== WIDE.width) await page.setViewportSize(WIDE)
    errors = []
    const begun = Date.now()
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
      await fresh()
    } finally {
      clearTimeout(timer)
    }
    // The unresolvable image request can fail after the next page has
    // started loading, and its console error then landed on that page (seen
    // in CI as a DNS error on the callout docs page). A fresh tab keeps the
    // error with the job that caused it.
    if (loadsBrokenImage(job)) await fresh()
    timings.push({ id: job.id, viewMode: job.viewMode, theme: job.theme, ms: Date.now() - begun })
    done++
    if (done % 100 === 0) console.log(`  ${done}/${mine.length} pages`)
  }
  await page?.close().catch(() => {})
}

const queue = [...mine]
await Promise.all(Array.from({ length: workers }, () => worker(queue)))
await browser.close()
server?.close()

const label = (f) => `[${f.theme}] ${f.viewMode === 'docs' ? 'docs ' : ''}${f.id}: ${f.finding}`
const lines = failures.map(label).sort()
const seconds = Math.round((Date.now() - started) / 1000)
const part = shards > 1 ? `, shard ${shard}/${shards}` : ''
const summary = `${stories.length} stories and ${docs.length} docs pages audited (${mine.length} page loads${part}, ${seconds}s): ${
  failures.length ? `${failures.length} findings` : 'CLEAN'
}`
console.log(summary)
if (lines.length) console.log(lines.join('\n'))

if (outDir) {
  mkdirSync(outDir, { recursive: true })
  timings.sort((a, b) => b.ms - a.ms)
  const report = { summary, stories: stories.length, docs: docs.length, failures, timings }
  writeFileSync(join(outDir, 'audit.json'), JSON.stringify(report, null, 2))
  writeFileSync(join(outDir, 'audit.md'), `# Browser audit\n\n${summary}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`)
}
process.exit(failures.length ? 1 : 0)
