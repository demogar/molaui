import { expect, type Locator, test } from '@playwright/test'

/**
 * Thread's stick-to-bottom, driven in a real browser.
 *
 * It is the one behaviour in the AI layer that jsdom cannot test (no layout,
 * so no scrollHeight and no ResizeObserver) and the visual suite cannot
 * either: the story adds a turn every 900ms and native scroll events arrive
 * on the browser's schedule, so its screenshot is excluded as unstable (see
 * `stories.visual.ts`). So it is asserted as behaviour instead, on the real
 * clock: following while at the bottom, letting go when the reader scrolls
 * up, and "Jump to latest" bringing them back.
 */
const STORY = 'ai-message--thread-stick-to-bottom'

// The same threshold Thread uses by default.
const distanceFromBottom = (scroller: Locator) =>
  scroller.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)

test.use({ viewport: { width: 1280, height: 900 } })

test('Thread follows new turns only while the reader is at the bottom', async ({ page }) => {
  await page.goto(`/iframe.html?id=${STORY}&viewMode=story&globals=theme:light`)
  const scroller = page.getByLabel('Conversation with Cayuco transcript', { exact: true })
  const turns = page.locator('[data-slot="message"]')
  const jump = page.getByRole('button', { name: 'Jump to latest' })
  await expect(scroller).toBeVisible()

  // Wait for the transcript to overflow, then for one more turn: a turn that
  // arrives while the reader is at the bottom keeps them there.
  await expect.poll(() => scroller.evaluate((el) => el.scrollHeight > el.clientHeight + 200), { timeout: 15_000 }).toBe(true)
  const before = await turns.count()
  await expect.poll(() => turns.count(), { timeout: 5_000 }).toBeGreaterThan(before)
  await expect.poll(() => distanceFromBottom(scroller)).toBeLessThanOrEqual(48)
  await expect(jump).toBeHidden()

  // Scrolling up lets go: "Jump to latest" appears, and the next turn does
  // not drag the reader back down.
  await scroller.hover()
  await page.mouse.wheel(0, -5_000)
  await expect(jump).toBeVisible()
  const readingAt = await scroller.evaluate((el) => el.scrollTop)
  const whileAway = await turns.count()
  await expect.poll(() => turns.count(), { timeout: 5_000 }).toBeGreaterThan(whileAway)
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeLessThanOrEqual(readingAt + 1)
  await expect(jump).toBeVisible()

  // "Jump to latest" brings the reader to the bottom and resumes following.
  await jump.click()
  await expect(jump).toBeHidden()
  await expect.poll(() => distanceFromBottom(scroller)).toBeLessThanOrEqual(48)
  const back = await turns.count()
  await expect.poll(() => turns.count(), { timeout: 5_000 }).toBeGreaterThan(back)
  await expect.poll(() => distanceFromBottom(scroller)).toBeLessThanOrEqual(48)
})
