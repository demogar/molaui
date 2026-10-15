import { expect, type Locator, type Page, test } from '@playwright/test'

import { mine } from './shard'

/**
 * SideBySideDiff's two panes, scrolled in a real browser.
 *
 * jsdom has no layout and no scrolling, and a screenshot is taken at rest, so
 * neither saw the bug this guards: each pane's scroll was echoed back a frame
 * late and undid the reader's own scrolling (see `echoes` in
 * side-by-side-diff.tsx). It is measured instead, every frame, while the
 * panes are scrolled by the wheel and by the keyboard: the panes stay level
 * within a pixel, neither moves backwards during a gesture that only goes one
 * way, the pane being scrolled travels as far as it was asked to, the gutter
 * stays at the pane's start, and the scroll-edge cue says what the position
 * says.
 */
const STORY = 'ai-side-by-side-diff--default'

// Chromium scrolls 40px for each arrow key and each wheel line.
const STEP = 40

interface Frame {
  left: number[]
  cue: boolean[]
  more: number[]
  gutter: number[]
}

test.use({ viewport: { width: 1280, height: 900 } })

for (const [i, direction] of (['ltr', 'rtl'] as const).entries()) {
  test(`the side-by-side diff's panes scroll as one (${direction})`, async ({ page }) => {
    // Two shards run one direction each; the screenshots are dealt across all of them.
    test.skip(!mine(i + 2))
    await page.goto(`/iframe.html?id=${STORY}&viewMode=story&globals=theme:light;direction:${direction}`)
    const panes = page.locator('[data-slot="side-by-side-diff"] [data-panes] [role="region"]')
    await expect(panes).toHaveCount(2)
    await expect(panes.first()).toBeVisible()
    const max = await panes.first().evaluate((el) => el.scrollWidth - el.clientWidth)
    // The story's longest line has to overflow, or nothing here is tested.
    expect(max).toBeGreaterThan(10 * STEP)

    // Both panes are the same size, so they can come to rest level at either end.
    const sizes = await panes.evaluateAll((els) => els.map((el) => [el.clientWidth, el.scrollWidth]))
    expect(sizes[0]).toEqual(sizes[1])

    // Rows line up across the panes, filler rows included.
    const tops = await panes.evaluateAll((els) =>
      els.map((el) => [...el.querySelectorAll('li')].map((li) => Math.round(li.getBoundingClientRect().top))),
    )
    expect(tops[0]).toEqual(tops[1])

    for (const side of [0, 1]) {
      const pane = panes.nth(side)
      const name = `pane ${side === 0 ? 'before' : 'after'}`

      // Wheel, as a stream of events faster than the frame rate.
      await reset(panes)
      await record(page)
      await pane.hover()
      for (let n = 0; n < 8; n++) await page.mouse.wheel(STEP, 0)
      await rest(pane)
      check(await frames(page), `${name}, wheel`)
      expect(await pane.evaluate((el) => el.scrollLeft), `${name}: the wheel moved it as far as asked`).toBeCloseTo(8 * STEP, -0.5)

      // Keyboard: each arrow key starts a smooth scroll, which the old echo cancelled.
      await reset(panes)
      await record(page)
      await pane.focus()
      for (let n = 0; n < 10; n++) await page.keyboard.press('ArrowRight')
      await rest(pane)
      check(await frames(page), `${name}, keyboard`)
      expect(await pane.evaluate((el) => el.scrollLeft), `${name}: the arrow keys moved it as far as asked`).toBeCloseTo(10 * STEP, -0.5)

      // On to the end, and back: both rest level with the cue off, then on.
      await record(page)
      await pane.hover()
      await page.mouse.wheel(max + 100, 0)
      await rest(pane)
      check(await frames(page), `${name}, to the end`)
      // The end itself, which the cue's border gives back 2px of as it comes off.
      const ends = await panes.evaluateAll((els) => els.map((el) => el.scrollWidth - el.clientWidth))
      expect(ends[0]).toBe(ends[1])
      expect(await positions(panes)).toEqual(ends)
      await expect(panes.nth(0)).not.toHaveAttribute('data-overflow-end')
      await expect(panes.nth(1)).not.toHaveAttribute('data-overflow-end')
      await page.mouse.wheel(-(max + 100), 0)
      await rest(pane)
      expect(await positions(panes)).toEqual([0, 0])
      await expect(panes.nth(0)).toHaveAttribute('data-overflow-end')
      await expect(panes.nth(1)).toHaveAttribute('data-overflow-end')
    }
  })
}

test("short lines still fill the side-by-side diff's panes", async ({ page }) => {
  test.skip(!mine(4))
  // The right-to-left hard state, the second diff, compares two short lines a side.
  await page.goto('/iframe.html?id=ai-side-by-side-diff--hard-states&viewMode=story&globals=theme:light')
  const panes = page.locator('[data-slot="side-by-side-diff"]').nth(1).locator('[data-panes] [role="region"]')
  await expect(panes.first()).toBeVisible()
  const short = await panes.evaluateAll((els) =>
    els.flatMap((el) =>
      [...el.querySelectorAll<HTMLElement>('li, [data-part="hunk-header"]')]
        .filter((row) => row.getBoundingClientRect().width < el.clientWidth - 0.5)
        .map((row) => `${row.textContent?.trim()}: ${Math.round(row.getBoundingClientRect().width)} of ${el.clientWidth}px`),
    ),
  )
  expect(short, 'rows, washes and hunk headers span the pane').toEqual([])
})

const positions = (panes: Locator) => panes.evaluateAll((els) => els.map((el) => Math.round(el.scrollLeft)))

async function reset(panes: Locator) {
  await panes.evaluateAll((els) => els.forEach((el) => (el.scrollLeft = 0)))
  await expect.poll(() => positions(panes)).toEqual([0, 0])
}

/** Waits until the pane has not moved for a quarter of a second. */
async function rest(pane: Locator) {
  let last = NaN
  await expect
    .poll(
      async () => {
        const now = await pane.evaluate(async (el) => {
          await new Promise((resolve) => setTimeout(resolve, 250))
          return el.scrollLeft
        })
        const still = now === last
        last = now
        return still
      },
      { intervals: [0] },
    )
    .toBe(true)
}

/** Starts sampling both panes once a frame, after the frame's scroll events. */
async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __stop?: () => void }
    w.__stop?.()
    const regions = [...document.querySelectorAll<HTMLElement>('[data-panes] [role="region"]')]
    w.__frames = []
    let id = 0
    const tick = () => {
      w.__frames.push({
        left: regions.map((el) => el.scrollLeft),
        cue: regions.map((el) => el.hasAttribute('data-overflow-end')),
        more: regions.map((el) => el.scrollWidth - el.clientWidth - el.scrollLeft),
        gutter: regions.map((el) => {
          const gutter = el.querySelector('[data-part="gutter"]')
          return gutter ? gutter.getBoundingClientRect().left - el.getBoundingClientRect().left : NaN
        }),
      })
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    w.__stop = () => cancelAnimationFrame(id)
  })
}

const frames = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __stop?: () => void }
    w.__stop?.()
    return w.__frames
  })

function check(trace: Frame[], what: string) {
  expect(trace.length, `${what}: frames were sampled`).toBeGreaterThan(5)
  for (const [n, frame] of trace.entries()) {
    const at = `${what}, frame ${n}`
    const [a = NaN, b = NaN] = frame.left
    expect(Math.abs(a - b), `${at}: the panes are level (${a} / ${b})`).toBeLessThanOrEqual(1)
    for (const side of [0, 1]) {
      expect(frame.gutter[side], `${at}: the gutter stays at the pane's start`).toBe(0)
      expect(frame.cue[side], `${at}: the cue matches the position`).toBe((frame.more[side] ?? 0) > 1)
      const previous = trace[n - 1]?.left[side]
      // Every gesture here goes one way, so a pane moving against the one
      // before it is the echo pulling it back.
      if (previous !== undefined && n > 1) {
        const before = trace[n - 2]?.left[side] ?? previous
        const step = Math.sign(Math.round(frame.left[side]! - previous))
        const last = Math.sign(Math.round(previous - before))
        expect(step * last, `${at}: pane ${side} does not reverse`).toBeGreaterThanOrEqual(0)
      }
    }
  }
}
