// Browser audit over every story and every docs page: axe (with real colour
// contrast) in both themes, that every `data-theme` subtree paints its own
// ground, a visible and unclipped focus indicator on every tab stop, pointer
// targets of at least 24px at compact density, horizontal overflow at
// 390px, reflow at 320px (clipped or overlapping text, squeezed numbers,
// sideways scrolling without the scroll-edge cue; every story again at
// spacious density, the composed screens at 1024 and 768 too), anatomy pins
// that overlap or leave their diagram (scripts/anatomy-scan.mjs), console errors, and runtime cost (layout transitions,
// infinite animations, budgets; scripts/runtime-scan.mjs). Exits non-zero on
// any finding, so CI can gate on it.
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

import { anatomyScan, hasAnatomy } from './anatomy-scan.mjs'
import { focusScan } from './focus-scan.mjs'
import { BUDGETS, longTaskScan, runtimeScan } from './runtime-scan.mjs'
import { serve } from './serve-static.mjs'
import { targetSize } from './target-size.mjs'

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
// Short as well as narrow: the agent console's composer only landed on its
// run panel once the phone was shorter than the 900px the wide pass uses.
const REFLOW = { width: 320, height: 568 }
// The composed screens: every pattern (the agent console and the form among
// them) and the app shell. Measured at spacious density at three widths; every
// other story at 320 only.
const COMPOSED = /^(patterns-|components-layout-app-shell--)/

/**
 * Runs in the page at 320px. The document must not scroll sideways, and on a
 * story page no text may be hidden from someone reading it:
 *
 *   - clipped: a text run reaches past an ancestor that clips it
 *     (`overflow` other than visible) and that ancestor cannot be scrolled to
 *     reveal it. A scroller that really scrolls is allowed, because its
 *     overflow is reachable, but one that scrolls sideways must carry the
 *     `scroll-edge` cue, or nothing tells the reader there is more;
 *     a deliberate ellipsis (`text-overflow` or `line-clamp`) is allowed,
 *     because the cut is drawn.
 *   - overlapped: two text runs paint over each other. The page-level
 *     overflow measure passed while the agent console's composer sat on top
 *     of its run panel: nothing was wider than the page, the grid row was
 *     just shorter than its content.
 *   - squeezed: a number field narrower than the number in it. Spacious
 *     density once left a six-digit token limit in a 21px input showing
 *     "40,0". Text fields are left alone: a long URL or sentence scrolls in
 *     its field by design, with the caret to show where you are, but a
 *     number is read whole, and a cut one reads as a different number.
 *
 * Docs pages get only the page-level measure: their examples are the same
 * stories, checked on their own pages, inside Storybook's fixed-width frame.
 */
async function clipped(story) {
  for (const t of document.querySelectorAll('.docblock-argstable')) t.style.display = 'none'
  for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
  const found = []
  const over = document.documentElement.scrollWidth - window.innerWidth
  if (over > 1) found.push(`overflows by ${over}px`)
  if (!story) return found

  const roots = [document.getElementById('storybook-root'), ...document.querySelectorAll('body > [data-base-ui-portal]')].filter(Boolean)
  const label = (el) => {
    const slot = el.closest('[data-slot]')?.getAttribute('data-slot')
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${slot ? `${slot} ` : ''}"${text}"`
  }
  // `checkVisibility` also catches `content-visibility: hidden`, which is how
  // a closed accordion panel keeps its text findable. Visually hidden text
  // (sr-only) is clipped on purpose.
  const shown = (el) => {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.clipPath !== 'none' || (s.clip && s.clip !== 'auto')) return false
    }
    return true
  }
  const cuts = (s) => s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none'
  const inner = (a) => {
    const box = a.getBoundingClientRect()
    const left = box.left + a.clientLeft
    const top = box.top + a.clientTop
    return { left, top, right: left + a.clientWidth, bottom: top + a.clientHeight }
  }

  // A sticky header or a sticky save bar sits over the content scrolling
  // beneath it by design, and scrolling uncovers that content; only things in
  // the same pinned (or unpinned) layer are compared for overlap.
  // A control floated over a scrolling region ("Jump to latest" over a
  // thread) is the same kind of layer: absolutely placed in a box that also
  // holds a scroller it is not part of. A composer that is merely laid out
  // on top of a panel is not, and is still a finding.
  const floats = new Map()
  const floatsOverScroller = (a) => {
    if (!floats.has(a)) {
      const box = a.offsetParent
      const scrolls = (n) => {
        const s = getComputedStyle(n)
        return (
          (/auto|scroll/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) ||
          (/auto|scroll/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1)
        )
      }
      floats.set(a, !!box && [...box.querySelectorAll('*')].some((n) => !a.contains(n) && !n.contains(a) && scrolls(n)))
    }
    return floats.get(a)
  }
  const pinned = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const position = getComputedStyle(a).position
      if (/sticky|fixed/.test(position)) return a
      if (position === 'absolute' && floatsOverScroller(a)) return a
    }
    return null
  }

  const reported = new Set()
  const report = (key, message) => {
    if (reported.has(key) || reported.size >= 6) return
    reported.add(key)
    found.push(message)
  }

  // Each text run's line boxes are walked up through their ancestors and cut
  // down to what is actually on screen. A scroller that scrolls, or an
  // ellipsis, trims the box (the rest is reachable, or the cut is drawn); a
  // clipping ancestor that cannot scroll is a finding. What is left is what
  // the overlap check compares, so a truncated cell or a row scrolled out of
  // its frame is not mistaken for text painted over its neighbour.
  const boxes = []
  for (const [rootIndex, root] of roots.entries()) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.data.trim()) continue
      const el = node.parentElement
      if (!el || el.closest('svg, script, style')) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
      if (!rects.length || !shown(el)) continue
      for (const line of rects) {
        let r = { left: line.left, top: line.top, right: line.right, bottom: line.bottom }
        for (let a = el; a && a !== document.body && r; a = a.parentElement) {
          const s = getComputedStyle(a)
          const clipsX = s.overflowX !== 'visible'
          const clipsY = s.overflowY !== 'visible'
          if (!clipsX && !clipsY) continue
          const box = inner(a)
          // Sideways scrolling is reflow failing unless the region is meant to
          // scroll (a table, code, a tab or chip row) and says so with the
          // scroll-edge cue; an app shell's <main> scrolling sideways at 320
          // is the page overflowing with extra steps.
          const scrollsX = /auto|scroll/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1
          // The cue is the `scroll-edge` utility (which sets `--scroll-edge`)
          // drawn from `useScrollEdge`'s attributes, and it must be showing:
          // a region with more past its trailing edge carries
          // `data-overflow-end`.
          const cued =
            s.getPropertyValue('--scroll-edge').trim() === '1' &&
            a.hasAttribute('data-scroll-edge') &&
            (a.scrollWidth - a.clientWidth - Math.abs(a.scrollLeft) <= 1 || a.hasAttribute('data-overflow-end'))
          if (scrollsX && !cued)
            report(a, `scrolls sideways without the scroll-edge cue (${a.scrollWidth - a.clientWidth}px): ${label(a)}`)
          const trimX = cuts(s) || scrollsX
          const trimY = /auto|scroll/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 1
          const outX = clipsX && !trimX && (r.left < box.left - 1 || r.right > box.right + 1)
          const outY = clipsY && !trimY && (r.top < box.top - 1 || r.bottom > box.bottom + 1)
          if (outX || outY) {
            const by = Math.round(
              outX ? Math.max(box.left - r.left, r.right - box.right) : Math.max(box.top - r.top, r.bottom - box.bottom),
            )
            report(a, `text clipped by ${by}px: ${label(el)} inside ${label(a)}`)
            r = null
            break
          }
          if (clipsX) r = { ...r, left: Math.max(r.left, box.left), right: Math.min(r.right, box.right) }
          if (clipsY) r = { ...r, top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom) }
          if (r.right - r.left < 1 || r.bottom - r.top < 1) r = null
        }
        if (r) boxes.push({ el, r, root: rootIndex, pinned: pinned(el) })
      }
    }
  }

  // Controls join the overlap check as whole boxes: the agent console's
  // composer sat on its run panel's empty-state text without any two text
  // runs touching. Each box is cut to what its clipping ancestors show.
  //
  // An inline link that wraps is two line boxes, not one: its bounding box
  // spans both lines edge to edge and covered the text before it on the
  // first line, a Markdown answer's link reported as overlapping the words
  // it follows. So an inline control joins as each of its line boxes.
  for (const [rootIndex, root] of roots.entries()) {
    for (const el of root.querySelectorAll('button, input:not([type=hidden]), textarea, select, a[href], [role="button"], [role="combobox"]')) {
      if (!shown(el)) continue
      const rects = getComputedStyle(el).display === 'inline' ? [...el.getClientRects()] : [el.getBoundingClientRect()]
      for (const b of rects) {
        if (b.width < 2 || b.height < 2) continue
        let r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
        for (let a = el.parentElement; a && a !== document.body && r; a = a.parentElement) {
          const s = getComputedStyle(a)
          if (s.overflowX === 'visible' && s.overflowY === 'visible') continue
          const box = inner(a)
          if (s.overflowX !== 'visible') r = { ...r, left: Math.max(r.left, box.left), right: Math.min(r.right, box.right) }
          if (s.overflowY !== 'visible') r = { ...r, top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom) }
          if (r.right - r.left < 1 || r.bottom - r.top < 1) r = null
        }
        if (r) boxes.push({ el, r, root: rootIndex, pinned: pinned(el), control: true })
      }
    }
  }

  // Overlap: visible line boxes of different elements in the same layer
  // intersecting by more than a sliver, or a line box under a control it is
  // not part of. A dialog over the page is a layer on purpose, so a portal is
  // only compared with itself. Bucketed by 50px rows, so a long page is not
  // n².
  const rows = new Map()
  for (const b of boxes)
    for (let y = Math.floor(b.r.top / 50); y <= Math.floor(b.r.bottom / 50); y++) rows.set(y, [...(rows.get(y) ?? []), b])
  for (const row of rows.values()) {
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++) {
        const p = row[i]
        const q = row[j]
        if (p.root !== q.root || p.pinned !== q.pinned || (p.control && q.control) || p.el === q.el || p.el.contains(q.el) || q.el.contains(p.el)) continue
        const w = Math.min(p.r.right, q.r.right) - Math.max(p.r.left, q.r.left)
        const h = Math.min(p.r.bottom, q.r.bottom) - Math.max(p.r.top, q.r.top)
        const shorter = Math.min(p.r.bottom - p.r.top, q.r.bottom - q.r.top)
        if (w > 2 && h > shorter / 3) {
          const [text, other] = p.control ? [q, p] : [p, q]
          report(`${label(p.el)}|${label(q.el)}`, `text overlaps: ${label(text.el)} and ${other.control ? `the control ${other.el.tagName.toLowerCase()} ` : ''}${label(other.el)}`)
        }
      }
    }
  }

  for (const root of roots) {
    for (const input of root.querySelectorAll('input[inputmode="numeric"], input[inputmode="decimal"], input[type="number"]')) {
      if (!input.value || !shown(input) || getComputedStyle(input).textOverflow === 'ellipsis') continue
      if (input.scrollWidth > input.clientWidth + 1)
        report(
          input,
          `value does not fit its field (${input.clientWidth}px for ${input.scrollWidth}px): ${label(input.closest('[data-slot]') ?? input)} = "${input.value.slice(0, 20)}"`,
        )
    }
  }
  return found
}

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
  // Runtime cost does not depend on the theme, so it is measured once. Before
  // the focus scan, which switches transitions off to read settled paint.
  if (job.viewMode === 'story' && job.theme === 'light') found.push(...(await runtimeScan(page, job.id)))
  if (job.viewMode === 'story') found.push(...(await focusScan(page)))
  // Pointer targets of at least 24px (scripts/target-size.mjs). Size does not
  // change with the theme, so once per story, on the light page.
  if (job.viewMode === 'story' && job.theme === 'light') found.push(...(await targetSize(page)))
  // Anatomy pins must not overlap or leave their diagram
  // (scripts/anatomy-scan.mjs), in both themes, here and at 390px below.
  const anatomy = job.viewMode === 'docs' && (await hasAnatomy(page))
  if (anatomy) found.push(...(await anatomyScan(page)))
  if (anatomy && !job.overflow) {
    // The dark page has no phone pass of its own; narrowing it for the pins
    // costs one re-layout, not a page load. Only pages with a diagram pay it.
    await page.setViewportSize(PHONE)
    found.push(...(await anatomyScan(page)).map((f) => `[390px] ${f}`))
  }
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
    if (anatomy) found.push(...(await anatomyScan(page)).map((f) => `[390px] ${f}`))
    // WCAG 1.4.10 defines reflow at 320 CSS px, so the same page is narrowed
    // once more rather than loaded again. 390 stays: it is the phone most
    // people hold, and a layout can break at one width and not the other.
    await page.setViewportSize(REFLOW)
    const story = job.viewMode === 'story'
    found.push(...(await page.evaluate(clipped, story)).map((f) => `[320px] ${f}`))
    // Density is an attribute on <html>, so the spacious pass is the same
    // page with the attribute flipped, not another load. Spacious is the one
    // that breaks: it grows every control while the columns stay the same
    // width. It shrank the settings page's six-digit token limit to a 21px
    // field at 768 and 1024, where the form sits beside its section heading,
    // and was fine at 320, where it does not; so the composed screens, where
    // components meet a real layout, are measured at all three.
    // Every other story is measured at 320 (#130): density is a reader's
    // preference, and WCAG 1.4.10 does not exempt it, so a date picker or a
    // number input that only reflows at comfortable fails someone who chose
    // spacious. A lone component has no columns to squeeze it at 768 or 1024,
    // and one more measurement of an already loaded page costs little.
    if (story) {
      await page.evaluate(() => (document.documentElement.dataset.density = 'spacious'))
      for (const width of COMPOSED.test(job.id) ? [1024, 768, 320] : [320]) {
        await page.setViewportSize({ ...REFLOW, width })
        found.push(...(await page.evaluate(clipped, story)).map((f) => `[${width}px spacious] ${f}`))
      }
    }
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
// Timed budgets last, one page at a time, once nothing else is running.
for (const job of mine.filter((j) => j.viewMode === 'story' && j.theme === 'light' && BUDGETS[j.id])) {
  try {
    for (const f of await longTaskScan(browser, base, job.id)) failures.push({ ...job, finding: f })
  } catch (e) {
    failures.push({ ...job, finding: `long-task budget: ${String(e.message ?? e).split('\n')[0]}` })
  }
}
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
