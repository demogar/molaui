// Visual review: screenshot stories from a running Storybook.
// node scripts/shoot.mjs [--forced-colors] [--rtl] <outDir> <base> <id[:theme[:density[:width]]]>...
//
// --forced-colors emulates Windows High Contrast (`forced-colors: active`),
// which Chromium renders for real: author colours are replaced with system
// colours and box-shadows are dropped, so it shows what survives of the cut.
// With a dark theme it also emulates a dark OS scheme, so Chromium picks its
// dark high-contrast palette, as a dark Windows contrast theme would.
// --rtl sets the Direction global to right-to-left.
// Flags may appear anywhere; without them the output is unchanged.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const forced = args.includes('--forced-colors')
const rtl = args.includes('--rtl')
const [outDir, base, ...specs] = args.filter((arg) => !arg.startsWith('--'))
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
const suffix = `${forced ? '-forced' : ''}${rtl ? '-rtl' : ''}`
for (const spec of specs) {
  const [id, theme = 'light', density = 'comfortable', width = '1280'] = spec.split(':')
  await page.setViewportSize({ width: Number(width), height: 900 })
  if (forced) await page.emulateMedia({ forcedColors: 'active', colorScheme: theme === 'dark' ? 'dark' : 'light' })
  const direction = rtl ? ';direction:rtl' : ''
  const url = `${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};density:${density}${direction}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const file = `${outDir}/${id}--${theme}-${density}-${width}${suffix}.png`
  await page.screenshot({ path: file, fullPage: true })
  console.log(file)
}
await browser.close()
