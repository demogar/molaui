import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, type Page, test } from '@playwright/test'

/**
 * Every story in both themes, and the first story of each component in the
 * three modes most likely to break quietly: compact density, right-to-left,
 * and forced colours. Every story in every mode would be about 1,400
 * screenshots per run; the first story of a component is its canonical one,
 * and a regression in a mode almost always shows there.
 *
 * The list comes from the built Storybook's index, so a new story is covered
 * the moment it exists, and needs a baseline before CI passes.
 */
interface Entry {
  id: string
  title: string
  type: 'story' | 'docs'
}
const index = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../storybook-static/index.json'), 'utf8'),
) as { entries: Record<string, Entry> }
/**
 * Stories with no stable picture, each covered by its neighbours:
 * - long-answer streams 20,000 tokens to measure render cost; it is still
 *   mid-stream after 15 seconds of fake time, and how far it got depends on
 *   how fast the runner renders.
 * - thread-stick-to-bottom adds a turn every 900ms and follows it with
 *   native scrolling, whose scroll events arrive on the browser's schedule,
 *   not the fake clock's; about one run in four, "Jump to latest" showed.
 */
const UNSTABLE = new Set(['ai-streaming-text--long-answer', 'ai-message--thread-stick-to-bottom'])
const stories = Object.values(index.entries).filter((e) => e.type === 'story' && !UNSTABLE.has(e.id))
const firstOfEach = stories.filter((s, i) => stories.findIndex((t) => t.title === s.title) === i)

interface Mode {
  name: string
  theme: 'light' | 'dark'
  density?: 'compact'
  rtl?: boolean
  forced?: boolean
}
const everyStory: Mode[] = [
  { name: 'light', theme: 'light' },
  { name: 'dark', theme: 'dark' },
]
const representative: Mode[] = [
  { name: 'compact', theme: 'light', density: 'compact' },
  { name: 'rtl', theme: 'light', rtl: true },
  { name: 'forced', theme: 'light', forced: true },
]

/**
 * Time is frozen so that "4 minutes ago", an elapsed-time counter or a
 * retry countdown renders the same on every run, and the simulated agent's
 * streaming is run to completion in fake time rather than raced in real time.
 */
const NOW = new Date('2026-05-04T10:30:00Z')

async function open(page: Page, id: string, mode: Mode) {
  await page.clock.install({ time: NOW })
  await page.clock.pauseAt(NOW)
  if (mode.forced) await page.emulateMedia({ forcedColors: 'active', colorScheme: mode.theme })
  const globals = [`theme:${mode.theme}`, `density:${mode.density ?? 'comfortable'}`]
  if (mode.rtl) globals.push('direction:rtl')
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=${globals.join(';')}`)
  // Storybook boots on timers too, so the paused clock is stepped until the
  // story is on screen: Storybook has shown it, the decorator has applied
  // the theme, and the root (or a portal) holds something. `sb-show-main`
  // alone arrives a beat before React commits, and an empty root made a
  // 16×16 screenshot.
  await expect(async () => {
    await page.clock.runFor(100)
    const ready = await page.evaluate(
      (theme) =>
        document.body.classList.contains('sb-show-main') &&
        document.documentElement.dataset.theme === theme &&
        ((document.getElementById('storybook-root')?.childElementCount ?? 0) > 0 ||
          // A story that is only a portaled dialog leaves the root empty.
          [...document.body.children].some((el) => el.hasAttribute('data-base-ui-portal') || el.querySelector('[role="dialog"]'))),
      mode.theme,
    )
    expect(ready).toBe(true)
  }).toPass({ timeout: 20_000, intervals: [0] })
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

/**
 * Runs fake time forward until the story stops changing, or 15 seconds of
 * it have passed (every simulated stream, countdown and enter transition is
 * shorter).
 *
 * One `runFor(15_000)` was tried first and was flaky in CI: a simulated
 * stream schedules its next token from an effect, after React re-renders,
 * and React renders on a real MessageChannel task that the fake clock does
 * not drive. In one jump only the timers already queued fire, so how far a
 * stream got depended on the machine's speed. Stepping 100ms at a time and
 * letting React's queued tasks run between steps makes every run take the
 * same path.
 */
async function settle(page: Page) {
  const flush = () =>
    page.evaluate(async () => {
      // Tasks run in order, so a message posted now runs after any render
      // React has already queued; three rounds cover a render that yields.
      for (let i = 0; i < 3; i++) {
        await new Promise<void>((resolve) => {
          const channel = new MessageChannel()
          channel.port1.onmessage = () => resolve()
          channel.port2.postMessage(null)
        })
      }
      return document.body.innerHTML.length + ':' + document.body.innerText.length
    })
  let last = await flush()
  let quiet = 0
  for (let elapsed = 0; elapsed < 15_000 && quiet < 10; elapsed += 100) {
    await page.clock.runFor(100)
    const now = await flush()
    quiet = now === last ? quiet + 1 : 0
    last = now
  }
}

/**
 * The screenshot is the union of everything visible, the story root and any
 * portaled popup alike, rather than the whole 1280×900 viewport: most stories
 * are a few hundred pixels tall, and a tight crop keeps the committed
 * baselines small.
 */
async function bounds(page: Page) {
  return page.evaluate(() => {
    let right = 0
    let bottom = 0
    // Storybook's own loading, error and docs layers sit at the top of
    // <body> beside the story; only the story root and portals count.
    const own = (el: Element) => el.id === 'storybook-docs' || [...el.classList].some((c) => c.startsWith('sb-'))
    const layers = [...document.body.children].filter((el) => !own(el) && !['SCRIPT', 'STYLE'].includes(el.tagName))
    for (const el of layers.flatMap((layer) => [layer, ...layer.querySelectorAll('*')])) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      right = Math.max(right, r.right)
      bottom = Math.max(bottom, r.bottom)
    }
    const width = Math.min(Math.ceil(right + 16), document.documentElement.scrollWidth)
    const height = Math.min(Math.ceil(bottom + 16), document.documentElement.scrollHeight)
    return { x: 0, y: 0, width: Math.max(width, 1), height: Math.max(height, 1) }
  })
}

function suite(mode: Mode, list: Entry[]) {
  test.describe(mode.name, () => {
    test.use({ viewport: { width: 1280, height: 900 } })
    for (const story of list) {
      test(story.id, async ({ page }) => {
        await open(page, story.id, mode)
        await expect(page).toHaveScreenshot(`${story.id}--${mode.name}.png`, {
          clip: await bounds(page),
          fullPage: true,
        })
      })
    }
  })
}

for (const mode of everyStory) suite(mode, stories)
for (const mode of representative) suite(mode, firstOfEach)
