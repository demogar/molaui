import '@testing-library/jest-dom/vitest'

import { cleanup } from '@/test/render'
import { afterEach } from 'vitest'

/**
 * jsdom has no canvas: its `getContext()` returns null and prints "Not
 * implemented" through the virtual console, once per axe run that measures
 * glyphs (axe's icon-ligature check). That was 32 lines of noise per test run
 * burying real warnings. This returns the same null without the message, so
 * axe behaves exactly as before; installing the `canvas` package would change
 * what axe measures and add a native build to every install. Files that run
 * in the node environment have no HTMLCanvasElement at all.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
}

afterEach(() => {
  cleanup()
})
