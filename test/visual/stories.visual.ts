import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, type Page, test } from '@playwright/test'

import { DOCS_SHOTS } from './docs-pages'
import { NOW, settle } from './helpers'
import { mine } from './shard'

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


async function open(page: Page, id: string, mode: Mode) {
  // Installed a minute early, then paused at NOW: the installed clock runs
  // in real time until it is paused, so `install({ time: NOW })` followed by
  // `pauseAt(NOW)` failed with "Cannot fast-forward to the past" whenever a
  // busy machine let a millisecond pass between the two calls.
  await page.clock.install({ time: NOW.getTime() - 60_000 })
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

/**
 * Stories photographed in forced colours although they are not the first of
 * their component, because what they show is exactly what forced colours
 * removes: the relleno slits (a gradient) and the diente teeth (a
 * currentColor fill). Both vanished there until cloth.css gave them system
 * colours; the first Divider story is a plain keyline and would not notice.
 */
const FORCED_TOO = new Set(['components-layout-divider--relleno', 'components-layout-divider--diente'])
const forcedToo = stories.filter((s) => FORCED_TOO.has(s.id) && !firstOfEach.includes(s))
if (forcedToo.length !== FORCED_TOO.size) throw new Error(`A forced-colours story is missing from the index: ${[...FORCED_TOO].join(', ')}`)

/** Every screenshot in a fixed order, which `mine()` deals across shards. */
const shots = [
  ...everyStory.flatMap((mode) => stories.map((story) => ({ mode, story }))),
  ...representative.flatMap((mode) => (mode.forced ? [...firstOfEach, ...forcedToo] : firstOfEach).map((story) => ({ mode, story }))),
]
const file = ({ mode, story }: (typeof shots)[number]) => `${story.id}--${mode.name}.png`

for (const mode of [...everyStory, ...representative]) {
  test.describe(mode.name, () => {
    test.use({ viewport: { width: 1280, height: 900 } })
    shots.forEach((shot, i) => {
      if (shot.mode !== mode || !mine(i)) return
      test(shot.story.id, async ({ page }) => {
        await open(page, shot.story.id, mode)
        await expect(page).toHaveScreenshot(file(shot), {
          clip: await bounds(page),
          fullPage: true,
        })
      })
    })
  })
}

/**
 * `visual:update` writes new and changed baselines but never deletes one, so
 * a renamed or removed story would leave its PNGs committed for good, checked
 * out by every CI job. Any baseline no test compares against fails here,
 * which keeps the committed set exactly the screenshots taken (see "Visual
 * baselines" in CONTRIBUTING.md for why they are plain files and not LFS).
 */
if (mine(0)) {
  test('every committed baseline belongs to a screenshot', () => {
    const expected = new Set([...shots.map(file), ...DOCS_SHOTS.map((shot) => shot.file)])
    const committed = readdirSync(resolve(import.meta.dirname, '__screenshots__/linux')).filter((f) => f.endsWith('.png'))
    expect(committed.filter((f) => !expected.has(f))).toEqual([])
  })
}
