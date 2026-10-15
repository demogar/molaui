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

// A component page lists its own changes and release status, read from
// CHANGELOG.md, which only release-please writes. Screenshotted as they are,
// every release PR moved the pages it touched and failed Visual regression
// on the one PR whose checks gate a publish, for text the release itself
// wrote. Their content is held by changes.test.ts; here they are taken out
// of the layout, so the page's height does not move either.
const RELEASE_TEXT = '[data-changes], [data-release-status] { display: none !important; }'

test.use({ viewport: { width: 1280, height: 900 } })

// Dealt across the CI shards like the story screenshots (shard.ts).
DOCS_SHOTS.forEach(({ theme, id, file }, i) => {
  if (!mine(i)) return
  test(`docs ${theme} › ${id}`, async ({ page }) => {
    await open(page, id, theme)
    await page.addStyleTag({ content: RELEASE_TEXT })
    await expect(page).toHaveScreenshot(file, { fullPage: true })
  })
})
