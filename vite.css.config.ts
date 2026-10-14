import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * dist/mola-ui-components.css, the `components.css` entry: the stylesheet for
 * an app that already has page styles, without the document-wide preflight
 * and base (see src/styles/components.css).
 *
 * A build of its own because the library build makes exactly one CSS file
 * (`cssCodeSplit: false`), and a second CSS entry there would either merge
 * into it or split the library's own. Run after the library build, which
 * empties dist/, so this one must not.
 */
export default defineConfig({
  publicDir: false,
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    copyPublicDir: false,
    rolldownOptions: {
      input: { 'mola-ui-components': resolve(import.meta.dirname, 'src/styles/components.css') },
      output: { assetFileNames: '[name][extname]' },
    },
  },
})
