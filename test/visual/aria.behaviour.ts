import { expect, type Locator, type Page, test } from '@playwright/test'

import { NOW, settle } from './helpers'
import { mine } from './shard'

/**
 * The accessibility tree of the composite components, as Chromium computes
 * it, pinned with Playwright's ARIA snapshots.
 *
 * A composite (a menu, a listbox, a grid of days, a tab list, a transcript)
 * is where roles, names, states and ownership interlock, and where a refactor
 * can quietly break them: a wrapper that swallows `role="option"`, a label
 * that stops reaching its listbox, a selected tab that loses `aria-selected`.
 * axe (src/test/stories.test.tsx, scripts/audit.mjs) only catches the
 * invalid; a tree that is valid but different passes it. The keyboard tests
 * check behaviour, not the whole shape.
 *
 * The tree comes from the browser, not jsdom. A jsdom serialiser was the other
 * option: it would run in the unit suite and need no build, but it would be a
 * serialiser of our own over dom-accessibility-api, so the names and roles it
 * pinned would be its approximation of the accessible-name algorithm, not
 * what a screen reader is handed, and it cannot open a positioned popup the
 * way a person does. Chromium computes the real tree, portals included, and
 * the stories are already built for the visual shards, so each snapshot
 * costs about a second there.
 *
 * Unlike screenshots the snapshots are text and do not depend on font
 * rasterisation, so they live in `__aria__/` without a platform segment and
 * can be updated on any machine (`npm run visual:update`). Review the YAML
 * diff like code: every changed line is a change a screen reader hears.
 *
 * The match is partial: a node written without a name matches any name, and
 * an update only rewrites a snapshot that failed. The select's listbox was
 * pinned as a bare `listbox:` that way, so once it was named nothing changed
 * in the file until the name was written in by hand (#142). Write names in.
 */

interface Case {
  /** Snapshot file name. */
  name: string
  story: string
  /** Brings the composite into the state worth pinning (usually open). */
  act?: (page: Page) => Promise<void>
  /** What to snapshot; the whole body by default, portals included. */
  target?: (page: Page) => Locator
  /**
   * States the snapshot cannot show. Playwright's ARIA YAML has no
   * `[current]`, so a pagination whose current page lost `aria-current`
   * would snapshot the same. Such states are asserted here, on the same page.
   */
  also?: (page: Page) => Promise<void>
}

const CASES: Case[] = [
  // Both menu stories open by default.
  { name: 'menu', story: 'components-overlays-menu--row-actions' },
  { name: 'menu-checkbox-and-radio', story: 'components-overlays-menu--checkbox-and-radio' },
  { name: 'select', story: 'components-forms-select--default', act: (page) => page.getByRole('combobox', { name: 'Environment' }).click() },
  {
    name: 'combobox',
    story: 'components-forms-combobox--default',
    act: async (page) => {
      await page.getByRole('combobox', { name: /Reviewer/ }).click()
      await page.keyboard.press('ArrowDown')
    },
  },
  { name: 'tabs', story: 'components-navigation-tabs--underline' },
  { name: 'accordion', story: 'components-navigation-accordion--default' },
  // Paginated rather than the selection demo: sort buttons, the column menu
  // trigger and the page navigation, over ten rows instead of every run.
  {
    name: 'data-table',
    story: 'components-data-display-table--paginated',
    also: async (page) => {
      const pages = page.getByRole('navigation', { name: 'Agent runs pages' })
      await expect(pages.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
      await expect(pages.locator('[aria-current]')).toHaveCount(1)
    },
  },
  { name: 'command-palette', story: 'components-overlays-command-palette--default' },
  {
    name: 'date-picker',
    story: 'components-forms-date-picker--schedule-evaluation',
    act: (page) => page.getByRole('button', { name: 'Choose date' }).click(),
  },
  { name: 'toolbar', story: 'components-layout-toolbar--run-actions' },
  { name: 'segmented-control', story: 'components-forms-segmented-control--default' },
  // The agent console's transcript, once a suggested question has been asked
  // and the scripted run has finished.
  {
    name: 'thread',
    story: 'ai-agent-console--console',
    act: (page) => page.getByRole('button', { name: /^Which guardrails/ }).click(),
    target: (page) => page.locator('[data-slot="thread"]'),
  },
]

test.use({ viewport: { width: 1280, height: 900 } })

async function open(page: Page, story: string) {
  // The same frozen clock as the screenshots, so relative times and run
  // durations read the same on every run.
  await page.clock.install({ time: NOW.getTime() - 60_000 })
  await page.clock.pauseAt(NOW)
  await page.goto(`/iframe.html?id=${story}&viewMode=story&globals=theme:light`)
  await expect(async () => {
    await page.clock.runFor(100)
    const ready = await page.evaluate(
      () =>
        document.body.classList.contains('sb-show-main') &&
        ((document.getElementById('storybook-root')?.childElementCount ?? 0) > 0 ||
          [...document.body.children].some((el) => el.hasAttribute('data-base-ui-portal'))),
    )
    expect(ready).toBe(true)
  }).toPass({ timeout: 20_000, intervals: [0] })
  await settle(page)
}

CASES.forEach((c, i) => {
  // Dealt across the shards after the thread behaviour test, which takes slot 0.
  if (!mine(i + 1)) return
  test(`${c.name} keeps its accessibility tree`, async ({ page }) => {
    await open(page, c.story)
    if (c.act) {
      await c.act(page)
      await settle(page)
    }
    await expect((c.target ?? ((p: Page) => p.locator('body')))(page)).toMatchAriaSnapshot({ name: `${c.name}.aria.yml` })
    await c.also?.(page)
  })
})
