type Theme = 'light' | 'dark'

/**
 * Whether this preview is an example frame inside a docs page, and that
 * page's theme. Kept apart from docs-theme.tsx because the story decorator
 * asks it while rendering, and src/test/ssr-stories.test.tsx renders every
 * story on a server through that decorator: docs-theme.tsx imports
 * Storybook's doc blocks, which touch `document` as soon as they load.
 */

/** The docs page this preview is an example frame of, if it is one. */
export function docsPageAround(): Document | undefined {
  // On a server (the SSR test) there is no frame and no docs page.
  if (typeof window === 'undefined' || window.parent === window) return undefined
  try {
    const parent = window.parent.document
    return parent.getElementById('storybook-docs') ? parent : undefined
  } catch {
    // A cross-origin parent: an embed, not a docs page.
    return undefined
  }
}

/** The theme of the docs page around this example frame, if it is one. */
export function docsFrameTheme(): Theme | undefined {
  const theme = docsPageAround()?.documentElement.dataset.theme
  return theme === 'light' || theme === 'dark' ? theme : undefined
}
