import { expect, type Page, test } from '@playwright/test'

import { mine } from './shard'

/**
 * Docs pages follow the toolbar's theme, asserted as behaviour beside the
 * screenshots in docs.visual.ts: a screenshot says the page changed, these
 * say what changed, and they run on any machine (the screenshots compare only
 * against Linux baselines).
 *
 * "Dark" is measured, not named: the relative luminance of the painted
 * ground, which is about 0.01 on the dyed cloth and 0.85 on bleached cotton.
 */
test.use({ viewport: { width: 1280, height: 900 } })
// One shard runs these (not the one that runs thread.behaviour.ts).
test.skip(!mine(1))

const INTRODUCTION = 'mola-ui-introduction--overview'

async function openDocs(page: Page, id: string, theme: 'light' | 'dark') {
  await page.goto(`/iframe.html?id=${id}&viewMode=docs&globals=theme:${theme}`)
  await expect(page.locator('.sbdocs-content')).toBeVisible()
}

/** Relative luminance (WCAG) of an element's computed background colour. */
function groundLuminance(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const [r, g, b] = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []).map(Number)
    const lin = (c = 0) => {
      const s = c / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  })
}

test('an MDX page with no stories takes the toolbar theme', async ({ page }) => {
  await openDocs(page, INTRODUCTION, 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => groundLuminance(page, '.sbdocs-wrapper')).toBeLessThan(0.05)

  await openDocs(page, INTRODUCTION, 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => groundLuminance(page, '.sbdocs-wrapper')).toBeGreaterThan(0.6)
})

test('switching the toolbar re-themes an open docs page', async ({ page }) => {
  await openDocs(page, INTRODUCTION, 'light')
  await expect.poll(() => groundLuminance(page, '.sbdocs-wrapper')).toBeGreaterThan(0.6)
  // What the toolbar does: the manager asks the preview to update globals.
  await page.evaluate(() => {
    const channel = (window as unknown as { __STORYBOOK_ADDONS_CHANNEL__: { emit: (event: string, data: unknown) => void } })
      .__STORYBOOK_ADDONS_CHANNEL__
    channel.emit('updateGlobals', { globals: { theme: 'dark' } })
  })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => groundLuminance(page, '.sbdocs-wrapper')).toBeLessThan(0.05)
})

test('a component page themes its prose and args table, not only its examples', async ({ page }) => {
  await openDocs(page, 'components-actions-button--overview', 'dark')
  await expect.poll(() => groundLuminance(page, '.sbdocs-wrapper')).toBeLessThan(0.05)
  await expect(page.locator('.docblock-argstable').first()).toBeVisible()
  await expect.poll(() => groundLuminance(page, '.docblock-argstable tbody')).toBeLessThan(0.05)
})

test('a pattern page themes the examples it renders in iframes', async ({ page }) => {
  // Each example is a preview of its own in an iframe, and Storybook gives
  // it no globals; it follows the page it sits in.
  await openDocs(page, 'patterns-confirmation--overview', 'dark')
  await expect.poll(() => groundLuminance(page, '.sbdocs-wrapper')).toBeLessThan(0.05)
  // The frames load lazily, as they scroll into view.
  await page.locator('.docs-story iframe').first().scrollIntoViewIfNeeded()
  const example = page.frameLocator('.docs-story iframe').first()
  await expect(example.locator('html')).toHaveAttribute('data-theme', 'dark')
  // And the page is not turned back to light by its examples' own globals.
  await page.waitForTimeout(500)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('the table of contents lists the page, not headings inside its examples', async ({ page }) => {
  // Empty state's examples are titled with h3s ("No saved replies yet").
  await openDocs(page, 'components-feedback-empty-state--overview', 'light')
  // The anatomy diagram renders an example of its own, after the page.
  await expect(page.locator('[data-anatomy] .sb-story h3').first()).toBeAttached()
  await expect(page.locator('.toc-list-item > a', { hasText: 'Related' })).toBeAttached()
  const inExamples = await page.locator('.sb-story h2, .sb-story h3').allTextContents()
  expect(inExamples.length).toBeGreaterThan(0)
  const toc = await page.locator('.toc-list-item > a').allTextContents()
  expect(toc).toContain('Usage')
  for (const heading of inExamples) expect(toc).not.toContain(heading)
})
