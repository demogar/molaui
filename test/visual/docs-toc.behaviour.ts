import { expect, type Frame, type Page, test } from '@playwright/test'

import { mine } from './shard'

/**
 * Every entry in a docs page's table of contents scrolls to its heading.
 *
 * Most entries on component and pattern pages used to do nothing: the
 * headings written by the custom doc blocks (Usage, Examples, Accessibility,
 * a pattern's Built from and States) had no id, so tocbot linked them to
 * `#`, and Storybook's click handler dropped the click. Only the story titles,
 * which Storybook ids itself, worked. See .storybook/toc.ts.
 *
 * Checked in the composed Storybook (sidebar, the page in an iframe, the
 * click relayed to the manager's URL) and in the bare preview iframe that an
 * embed or a deep link opens, on a component page and a pattern page.
 */
test.use({ viewport: { width: 1280, height: 900 } })

const PAGES = [
  { id: 'components-actions-button--overview', kind: 'component' },
  { id: 'patterns-confirmation--overview', kind: 'pattern' },
] as const

/**
 * Rótulo labels inside a section, left out of the contents on purpose: listed,
 * they read as sections of their own between the real ones.
 */
const LABELS = ['When to use', 'When not to', 'Every example', 'Keyboard', 'Mola handles', 'You handle', 'Used in']

async function docsFrame(page: Page, id: string, view: 'composed' | 'iframe'): Promise<Frame> {
  if (view === 'iframe') {
    await page.goto(`/iframe.html?id=${id}&viewMode=docs&globals=theme:light`)
    return page.mainFrame()
  }
  await page.goto(`/?path=/docs/${id}&globals=theme:light`)
  const iframe = await page.waitForSelector('#storybook-preview-iframe')
  const frame = await iframe.contentFrame()
  if (!frame) throw new Error('no preview frame')
  return frame
}

const cases = PAGES.flatMap((p) => (['composed', 'iframe'] as const).map((view) => ({ ...p, view })))

cases.forEach(({ id, kind, view }, i) => {
  test(`every contents entry on a ${kind} page scrolls to its heading (${view})`, async ({ page }) => {
    test.skip(!mine(i))
    const frame = await docsFrame(page, id, view)
    const links = frame.locator('.toc-list-item > a')
    // tocbot builds the list 100ms after the page renders.
    await expect(links.first()).toBeAttached({ timeout: 20_000 })
    await frame.waitForTimeout(500)

    const entries = await links.evaluateAll((as) =>
      as.map((a) => {
        const href = a.getAttribute('href') ?? ''
        const target = href.startsWith('#') && href.length > 1 ? decodeURIComponent(href.slice(1)) : ''
        return { text: (a.textContent ?? '').trim(), href, hasTarget: Boolean(target && document.getElementById(target)) }
      }),
    )
    const texts = entries.map((e) => e.text)
    expect(texts).toContain('Usage')
    expect(texts).toContain('Accessibility')
    for (const label of LABELS) expect(texts.map((t) => t.toLowerCase())).not.toContain(label.toLowerCase())
    // No entry may point at a heading without an id, or at an id two headings share.
    expect(entries.filter((e) => !e.hasTarget).map((e) => e.text)).toEqual([])
    const hrefs = entries.map((e) => e.href)
    expect(hrefs.filter((h, n) => hrefs.indexOf(h) !== n)).toEqual([])

    for (let n = 0; n < entries.length; n++) {
      const { text, href } = entries[n]!
      await frame.evaluate(() => window.scrollTo(0, 0))
      await links.nth(n).click()
      // The heading ends near the top of the viewport, or as near as the page
      // allows: the last section of a short page cannot scroll that far up.
      await expect
        .poll(
          () =>
            frame.evaluate((target) => {
              const heading = document.getElementById(target)!
              const top = heading.getBoundingClientRect().top
              const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
              return (top >= 0 && top <= 120) || (atBottom && top >= 0 && top < window.innerHeight)
            }, decodeURIComponent(href.slice(1))),
          { message: `"${text}" (${href}) scrolls its heading to the top`, timeout: 5_000 },
        )
        .toBe(true)
      // Let the smooth scroll finish before the next entry resets it.
      await frame.evaluate(async () => {
        for (let last = -1; last !== window.scrollY; ) {
          last = window.scrollY
          await new Promise((resolve) => setTimeout(resolve, 150))
        }
      })
    }
  })
})
