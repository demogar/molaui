import { defineConfig } from '@playwright/test'

/**
 * Visual regression over the static Storybook build.
 *
 * Baselines are rendered on Linux only, by CI's own image, because font
 * rasterisation differs between operating systems by more than any useful
 * threshold: a macOS run against Linux baselines fails on anti-aliasing
 * alone. So the snapshot path carries the platform, only `linux/` is
 * committed, and new baselines come from the "Update visual baselines"
 * workflow (see CONTRIBUTING.md), never from a laptop.
 */
const port = Number(process.env.VISUAL_PORT ?? 6008)

export default defineConfig({
  testDir: '.',
  testMatch: '*.visual.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  outputDir: '../../test-results/visual',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      // Per-pixel colour tolerance stays at Playwright's default; the page as
      // a whole may differ by a tenth of a percent, which absorbs a stray
      // anti-aliased glyph edge but not a moved keyline or a changed colour.
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL: `http://localhost:${port}`,
    deviceScaleFactor: 1,
    browserName: 'chromium',
  },
  webServer: {
    command: `node scripts/serve-static.mjs storybook-static ${port}`,
    cwd: '../..',
    url: `http://localhost:${port}/index.json`,
    reuseExistingServer: !process.env.CI,
  },
})
