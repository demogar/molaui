import { expect, type Page, test } from '@playwright/test'

import { DOCS_SHOTS } from './docs-pages'
import { NOW, settle } from './helpers'
import { mine } from './shard'

// Which docs pages, and why only these: docs-pages.ts.
async function open(page: Page, id: string, theme: 'light' | 'dark') {
  await page.clock.install({ time: NOW.getTime() - 60_000 })
  await page.clock.pauseAt(NOW)
  await page.goto(`/iframe.html?id=${id}&viewMode=docs&globals=theme:${theme}`)
  // Ready when the page is themed and every example on it has rendered:
  // examples mount one by one after the page itself.
  await expect(async () => {
    await page.clock.runFor(100)
    const ready = await page.evaluate(
      (theme) =>
        document.documentElement.dataset.theme === theme &&
        document.querySelector('.sbdocs-content') !== null &&
        [...document.querySelectorAll('[data-story-block] > [id$="-inner"]')].every((el) => el.childElementCount > 0) &&
        [...document.images].every((img) => img.complete),
      theme,
    )
    expect(ready).toBe(true)
  }).toPass({ timeout: 30_000, intervals: [0] })
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

test.use({ viewport: { width: 1280, height: 900 } })

// Dealt across the CI shards like the story screenshots (shard.ts).
DOCS_SHOTS.forEach(({ theme, id, file }, i) => {
  if (!mine(i)) return
  test(`docs ${theme} › ${id}`, async ({ page }) => {
    await open(page, id, theme)
    await expect(page).toHaveScreenshot(file, { fullPage: true })
  })
})
