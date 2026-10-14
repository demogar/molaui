import { resolve } from 'node:path'

import { defineConfig } from 'vite'

/**
 * The `mola-ui-mcp` bin: mcp/bin.ts and everything it imports, the MCP SDK
 * and zod included, bundled into one file, dist/mcp/mola-ui-mcp.js.
 *
 * Bundled, not depended on: the SDK pulls in express, hono, ajv and a dozen
 * more, and as a dependency every app that installs the React library would
 * install them too. Bundling keeps the SDK a devDependency, so the library's
 * dependency list and its size-limit budgets do not change, and `npx
 * mola-ui-mcp` still runs with nothing else installed. Rolldown tree-shakes
 * the SDK down to the stdio server it uses.
 *
 * An SSR build, because that targets Node: Node's builtins stay imports and
 * packages resolve their Node entry points. `noExternal: true` is what makes
 * it a bundle; SSR builds otherwise leave every package external. It runs
 * after the library build (`npm run build`), which empties dist/ first.
 */
export default defineConfig({
  publicDir: false,
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: resolve(import.meta.dirname, 'mcp/bin.ts'),
    outDir: 'dist/mcp',
    emptyOutDir: true,
    target: 'node22',
    minify: true,
    sourcemap: false,
    rolldownOptions: {
      output: {
        format: 'es',
        entryFileNames: 'mola-ui-mcp.js',
        banner: '#!/usr/bin/env node',
        // One file: a bin with a chunk directory beside it is one more thing to get wrong in `files`.
        inlineDynamicImports: true,
      },
    },
  },
})
