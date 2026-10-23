// Runtime cost, for the browser audit (scripts/audit.mjs).
//
// The 2026-10-14 audit found three costs no gate could see: transitions on
// layout properties (the tabs indicator eased `left` and `width`, so every
// frame laid the bar out again), a loading table running 48 infinite shimmer
// animations at once, and an app shell whose first render was reported as a
// 1.1–1.4 s long task. jsdom does no layout and runs no animations, so only a
// browser can hold any of them.
//
// Measured before deciding what to gate. Most of that long task was not Mola:
// Storybook's accessibility addon runs axe after every render (294 ms of it on
// the app shell), and Storybook's own boot is about 130 ms on any story. With
// the addon held back, the shell's own render was 86 ms. So the long-task
// budget below is measured with the addon off, after the parallel audit has
// finished, on one page at a time; the rest is counted, not timed, because a
// count does not change with the runner's speed.

/**
 * Layout properties: a transition on any of them lays the page out on every
 * frame. `all` is included because it reaches them. src/components/motion.test.ts
 * holds the source to the same list, so a layout transition fails in the unit
 * tests before it reaches a browser.
 */
export const LAYOUT =
  /^(all|width|height|(min|max)-(width|height)|inline-size|block-size|left|right|top|bottom|inset(-.+)?|margin(-.+)?|padding(-.+)?|flex-basis|grid-template-(columns|rows)|font-size|line-height|border(-(top|right|bottom|left|inline|block)(-(start|end))?)?-width)$/

/**
 * The layout transitions kept on purpose, each with its reason. Anything else
 * is a finding: move it to `translate`, `scale` or `opacity`, snap it, or add
 * it here with the reason it cannot move. `selector` is what this browser scan
 * matches; `files` (under src/) is what motion.test.ts matches in the source,
 * and an entry no listed file still needs fails there, so the list cannot go
 * stale.
 *
 * The app shell's rail used to be here, easing `width` so the content took
 * the room it gave up. It snaps now: the content beside it is usually a data
 * table, and every frame of the ease laid the whole work area out again.
 */
export const LAYOUT_TRANSITIONS_ALLOWED = [
  {
    selector: '[data-slot="accordion-panel"], [data-slot="collapsible-panel"]',
    files: ['components/accordion/accordion.tsx'],
    property: 'height',
    why: "What is below the panel has to move as it opens; Base UI measures the height for exactly this (--accordion-panel-height, --collapsible-panel-height). Scaling the panel would squash its text and leave the content below to jump. It is a disclosure the reader asked for and watches open, not the frame around the work changing size.",
  },
  {
    selector: '[data-slot="toast"]',
    files: ['components/toast/toast.tsx'],
    property: 'height',
    why: "Base UI's stack: a toast takes the frontmost toast's height while collapsed and its own when the stack expands, and the toasts behind move by it. The stack is fixed and out of flow, so its layout never reaches the page.",
  },
]

/**
 * Infinite animations a single story may run at once. The loading table ran
 * 48, one sweep per bar; it now runs one per row. The busiest page skeleton
 * (Patterns/Empty states, loading) runs 20, one per bone, which is what a
 * whole screen of Skeletons costs and is the ceiling here.
 */
export const INFINITE_ANIMATIONS_MAX = 24

/**
 * Per-story budgets for the heaviest compositions: rendered nodes, and the
 * longest task with the a11y addon off.
 *
 * The ten-thousand-run table is the budget for `virtualize` (#104): about 490
 * nodes with the window in place. Rendered whole, the same table is over
 * 180,000 nodes and a load of several seconds, so a change that stops the
 * window holding fails here by two orders of magnitude, not by a margin.
 */
export const BUDGETS = {
  'components-layout-app-shell--cayuco': { nodes: 1200, longTaskMs: 400 },
  'components-data-display-table--ten-thousand-runs': { nodes: 700, longTaskMs: 400 },
}

export async function runtimeScan(page, id) {
  const found = await page.evaluate(
    ({ layout, allowed, maxInfinite }) => {
      const found = []
      const pattern = new RegExp(layout)
      // The story and whatever it portals; Storybook's own loader and error
      // panels are not Mola's.
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('body [class^="sb-"], [id^="storybook-"]:not(#storybook-root)')) continue
        const style = getComputedStyle(el)
        if (style.transitionProperty === 'none' || style.transitionProperty === '') continue
        const properties = style.transitionProperty.split(',').map((p) => p.trim())
        const durations = style.transitionDuration.split(',').map((d) => parseFloat(d))
        const moving = properties.filter((p, i) => pattern.test(p) && (durations[i % durations.length] ?? 0) > 0)
        const kept = moving.filter((p) => !allowed.some((a) => a.property === p && el.matches(a.selector)))
        if (kept.length) {
          const name = el.getAttribute('data-slot') ?? el.getAttribute('data-part') ?? el.tagName.toLowerCase()
          found.push(`transition on layout (${kept.join(', ')}) on ${name}: move it to translate, scale or opacity`)
        }
      }
      const infinite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime === Infinity).length
      if (infinite > maxInfinite) found.push(`${infinite} infinite animations running at once (at most ${maxInfinite})`)
      return [...new Set(found)]
    },
    { layout: LAYOUT.source, allowed: LAYOUT_TRANSITIONS_ALLOWED, maxInfinite: INFINITE_ANIMATIONS_MAX },
  )
  const budget = BUDGETS[id]
  if (budget) {
    const nodes = await page.evaluate(() => document.querySelectorAll('#storybook-root *').length)
    if (nodes > budget.nodes) found.push(`${nodes} rendered nodes (budget ${budget.nodes})`)
  }
  return found
}

/**
 * The longest task while a budgeted story loads, with Storybook's a11y addon
 * held back (`a11y.manual`), so the number is the story's and Storybook's
 * boot, not axe's. One page at a time, after the parallel audit, so other
 * pages are not competing for the CPU. Three loads, the fastest counted:
 * the budget is for the code, and a slow load is the runner.
 */
export async function longTaskScan(browser, base, id) {
  const budget = BUDGETS[id]
  const times = []
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.addInitScript(() => {
      window.__mola_long = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__mola_long = Math.max(window.__mola_long, e.duration)
      }).observe({ type: 'longtask', buffered: true })
    })
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:light;a11y.manual:!true`, { waitUntil: 'load' })
    await page.waitForFunction(() => (document.getElementById('storybook-root')?.childElementCount ?? 0) > 0)
    await page.waitForTimeout(1000)
    times.push(await page.evaluate(() => window.__mola_long))
    await page.close()
  }
  const best = Math.round(Math.min(...times))
  return best > budget.longTaskMs ? [`longest task ${best} ms while loading (budget ${budget.longTaskMs} ms, a11y addon off)`] : []
}
