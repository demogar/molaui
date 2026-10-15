import { expect, type Page, test } from '@playwright/test'

import { NOW, settle } from './helpers'
import { mine } from './shard'

/**
 * Docs pages in both themes, because the toolbar's theme reaches them too
 * (.storybook/docs-theme.tsx): with Dark selected, the prose, the args table
 * and the system's doc blocks go dark with the examples. They once stayed
 * light while only the examples switched, and a text-only page did not
 * switch at all; nothing caught it because every visual test opened a story,
 * never a page.
 *
 * Not every page: one of each kind that renders in the page itself. An MDX
 * page with no stories runs no decorator (Introduction); an MDX page whose
 * doc blocks resolve tokens (Color); an autodocs component page with its args
 * table (Button). All 107 in two themes would be the slowest tests in the
 * suite for regressions these three already show. A pattern page is left
 * out: its examples are lazily loaded iframes, each with its own clock, and
 * their screenshots differed between two runs of the same build; the
 * behaviour test checks those frames follow the theme instead. The browser
 * audit still checks every docs page in both themes for contrast.
 */
const PAGES = [
  'mola-ui-introduction--overview',
  'foundations-color--overview',
  'components-actions-button--overview',
]
const THEMES = ['light', 'dark'] as const

async function open(page: Page, id: string, theme: (typeof THEMES)[number]) {
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
const shots = THEMES.flatMap((theme) => PAGES.map((id) => ({ theme, id })))

for (const theme of THEMES) {
  test.describe(`docs ${theme}`, () => {
    for (const id of PAGES) {
      if (!mine(shots.findIndex((s) => s.theme === theme && s.id === id))) continue
      test(id, async ({ page }) => {
        await open(page, id, theme)
        await expect(page).toHaveScreenshot(`docs--${id}--${theme}.png`, { fullPage: true })
      })
    }
  })
}
