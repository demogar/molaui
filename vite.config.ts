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
 */
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
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
