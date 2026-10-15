import { cpSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

import pkg from './package.json' with { type: 'json' }

/**
 * Library build. Two outputs, and they are deliberately independent:
 *
 *   dist/index.js      ESM, one module per source file (`preserveModules`), so
 *                      a consumer's bundler tree-shakes at file granularity and
 *                      importing `Button` never pulls in the agent timeline.
 *   dist/mola-ui.css   the compiled stylesheet, from src/styles/index.css.
 *
 * Every dependency and peer is external: a design system that bundles its own
 * React, or its own copy of Base UI, ships two of them into the consumer.
 *
 * `'use client'` needs no plugin here. A bundler that merges modules into one
 * chunk has to drop a module's directive (it would apply to the whole chunk),
 * and the expected fix was a plugin that re-adds it per chunk. With
 * `preserveModules` each chunk is exactly one source module, and rolldown
 * keeps the directive at its top, so it is written in the source and nowhere
 * else. src/test/use-client.test.ts decides which modules need it; the Next.js
 * fixture in test/consumers proves it survives this build.
 */
/** The oldest browsers the stylesheet is built for. */
export const BROWSER_FLOOR = ['chrome123', 'edge123', 'firefox128', 'safari17.5'] as const

const external = [
  ...Object.keys(pkg.peerDependencies),
  ...Object.keys(pkg.dependencies),
].map((name) => new RegExp(`^${name}(/.*)?$`))

/**
 * The un-compiled layers, for a consumer who runs Tailwind v4 themselves and
 * wants Mola's tokens and utilities inside their own build rather than a
 * second, pre-compiled copy of Tailwind next to it.
 */
const copySourceStyles = {
  name: 'mola:copy-source-styles',
  closeBundle() {
    const out = resolve(import.meta.dirname, 'dist/tailwind')
    mkdirSync(out, { recursive: true })
    for (const file of ['mola.css', 'tokens.css', 'theme.css', 'cloth.css', 'base.css']) {
      cpSync(resolve(import.meta.dirname, 'src/styles', file), resolve(out, file))
    }
  },
}

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    copySourceStyles,
    dts({
      tsconfigPath: './tsconfig.build.json',
      entryRoot: 'src',
      exclude: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx', 'src/test/**', 'src/patterns/**', 'src/docs/**'],
    }),
  ],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  build: {
    target: 'es2022',
    // The browser floor, stated in the README. Without it the CSS target
    // follows `target` (es2022, roughly Safari 15), so Lightning CSS lowered
    // every light-dark() pair into --lightningcss-light/dark variable pairs
    // (~7 kB) for browsers the package cannot support anyway: light-dark()
    // itself needs Chrome 123 and Safari 17.5, and Tailwind v4's @property
    // needs Firefox 128. src/styles/support.test.ts keeps this list and the
    // README's in step.
    cssTarget: [...BROWSER_FLOOR],
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: { index: resolve(import.meta.dirname, 'src/index.ts') },
      formats: ['es'],
      cssFileName: 'mola-ui',
    },
    rolldownOptions: {
      external: [...external, /^react\/jsx-runtime$/],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Each test file still gets its own context, but jsdom is created once
    // per worker instead of once per file. With the default `threads` pool,
    // building jsdom 87 times was 40% of the run (vitest's own report).
    pool: 'vmThreads',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'figma/**/*.test.ts', 'codemods/**/*.test.ts', 'scripts/**/*.test.ts', 'mcp/**/*.test.ts', 'eslint/**/*.test.ts'],
    css: false,
  },
})
