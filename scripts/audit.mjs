// Browser audit over every story: axe (with real colour contrast) in both
// themes, horizontal overflow at phone width, and console errors.
//   node scripts/audit.mjs http://localhost:6006
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:6006'
const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const index = await (await fetch(`${base}/index.json`)).json()
const stories = Object.values(index.entries).filter((e) => e.type === 'story')

const browser = await chromium.launch()
const failures = []
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  let errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  for (const s of stories) {
    errors = []
    await page.goto(`${base}/iframe.html?id=${s.id}&viewMode=story&globals=theme:${theme}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
    await page.addScriptTag({ content: axeSource })
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run('#storybook-root', {
        rules: { region: { enabled: false }, 'landmark-one-main': { enabled: false }, 'page-has-heading-one': { enabled: false } },
      })
      // Base UI's focus guards are tabbable, aria-hidden sentinels that keep
      // focus inside an open menu or dialog. axe cannot know they are
      // sentinels; the components' keyboard tests prove the trap works.
      const isGuard = (n) => n.target.join(' ').includes('data-base-ui-focus-guard')
      return r.violations
        .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !isGuard(n)) }))
        .filter((v) => v.nodes.length > 0)
        .map((v) => `${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ') + ' — ' + (n.failureSummary ?? '').split('\n')[1]).join(' | ')}`)
    })
    for (const v of violations) failures.push(`[${theme}] ${s.id}: ${v}`)
    for (const e of errors.filter((e) => !/Download the React DevTools|favicon/.test(e) && !(s.id.includes('broken-image') && /ERR_NAME_NOT_RESOLVED/.test(e)))) failures.push(`[${theme}] ${s.id}: console: ${e.slice(0, 200)}`)
  }
  await page.close()
}

const phone = await browser.newPage({ viewport: { width: 390, height: 800 } })
for (const s of stories) {
  await phone.goto(`${base}/iframe.html?id=${s.id}&viewMode=story`, { waitUntil: 'networkidle' })
  await phone.waitForTimeout(150)
  const over = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (over > 1) failures.push(`[390px] ${s.id}: overflows by ${over}px`)
}
await browser.close()
console.log(`${stories.length} stories audited`)
console.log(failures.join('\n') || 'CLEAN')
