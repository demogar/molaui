// Visual review: screenshot stories from a running Storybook.
// node scripts/shoot.mjs <outDir> <base> <id[:theme[:density[:width]]]>...
import { chromium } from 'playwright'

const [outDir, base, ...specs] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const spec of specs) {
  const [id, theme = 'light', density = 'comfortable', width = '1280'] = spec.split(':')
  await page.setViewportSize({ width: Number(width), height: 900 })
  const url = `${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};density:${density}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const file = `${outDir}/${id}--${theme}-${density}-${width}.png`
  await page.screenshot({ path: file, fullPage: true })
  console.log(file)
}
await browser.close()
