import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'

/**
 * The ESLint plugin, `@demogar/mola-ui/eslint`: eslint/plugin.ts and the
 * check_code scanner it shares with the MCP server (mcp/check.ts,
 * mcp/data.ts), bundled into one file, dist/eslint/index.js, with its type
 * declaration beside it.
 *
 * Built the way vite.mcp.config.ts builds the bin, for the same reason: the
 * library's runtime dependency list does not change. The plugin imports
 * nothing but Node's builtins (scripts/deps.test.ts holds it to that), so the
 * bundle is the plugin's own code and nothing from npm ships inside it; ESLint
 * itself is the app's, never imported here at run time. `noExternal: true`
 * would inline a package if one were ever imported; the deps test is what
 * stops one being imported without being audited.
 *
 * Not minified: it is a dev tool, read in a stack trace when a rule misfires.
 */
export default defineConfig({
  publicDir: false,
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: resolve(import.meta.dirname, 'eslint/plugin.ts'),
    outDir: 'dist/eslint',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: false,
    rolldownOptions: {
      output: { format: 'es', entryFileNames: 'index.js', inlineDynamicImports: true },
    },
  },
  plugins: [
    {
      name: 'mola-eslint-types',
      generateBundle() {
        // Hand-written: the plugin's public shape is three names, and generating it would drag check.ts's internals in.
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: readFileSync(resolve(import.meta.dirname, 'eslint/index.d.ts'), 'utf8') })
      },
    },
  ],
})
