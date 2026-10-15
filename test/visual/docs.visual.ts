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

// Left out of the layout before the screenshot, so the page height holds:
//
// - A component page's Changes and release-status sections, read from
//   CHANGELOG.md, which only release-please writes. Screenshotted, every
//   release PR moved the pages it touched and failed Visual regression on
//   the one PR whose checks gate a publish. changes.test.ts holds their text.
// - Storybook's args table. react-docgen lists props, and the members of a
//   union, in whatever order the type checker hands them over on that build:
//   main failed on Button's page with `size` and `variant` swapped and
//   "primary" | "secondary" reordered, with no change to the source. It is
//   Storybook's chrome, not Mola's; the audit leaves it out too, and the
//   manifest test holds the props it lists.
const UNSTABLE = '[data-changes], [data-release-status], .docblock-argstable { display: none !important; }'

test.use({ viewport: { width: 1280, height: 900 } })

// Dealt across the CI shards like the story screenshots (shard.ts).
DOCS_SHOTS.forEach(({ theme, id, file }, i) => {
  if (!mine(i)) return
  test(`docs ${theme} › ${id}`, async ({ page }) => {
    await open(page, id, theme)
    await page.addStyleTag({ content: UNSTABLE })
    await expect(page).toHaveScreenshot(file, { fullPage: true })
  })
})
