// Regenerates the README screenshots from a running Storybook.
//   node scripts/readme-shots.mjs http://localhost:6006
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:6006'
const SHOTS = [
  // [file, story id, theme, density, width, mode]
  ['app-shell-light', 'components-layout-app-shell--cayuco', 'light', 'comfortable', 1280, 'viewport'],
  ['app-shell-dark-compact', 'components-layout-app-shell--cayuco', 'dark', 'compact', 1280, 'viewport'],
  ['agent-run-failed-dark', 'ai-agent-run--failed-at-step-four', 'dark', 'comfortable', 760, 'content'],
  ['tool-call-approval', 'ai-tool-call--needs-approval', 'light', 'comfortable', 760, 'content'],
  ['thread-light', 'ai-message--conversation', 'light', 'comfortable', 860, 'content'],
]

const browser = await chromium.launch()
for (const [file, id, theme, density, width, mode] of SHOTS) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 })
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};density:${density}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(500)
  const path = `docs/screenshots/${file}.png`
  if (mode === 'viewport') {
    await page.screenshot({ path })
  } else {
    const box = await page.locator('#storybook-root').evaluate((root) => {
      const r = root.getBoundingClientRect()
      const kids = [...root.querySelectorAll('*')].map((el) => el.getBoundingClientRect())
      const right = Math.max(r.left, ...kids.map((k) => k.right))
      const bottom = Math.max(r.top, ...kids.map((k) => k.bottom))
      return { x: 0, y: 0, width: Math.ceil(right + 16), height: Math.ceil(bottom + 16) }
    })
    await page.screenshot({ path, clip: box, fullPage: true })
  }
  console.log(path)
  await page.close()
}
await browser.close()
