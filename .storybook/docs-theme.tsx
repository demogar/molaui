import { DocsContainer, type DocsContainerProps } from '@storybook/addon-docs/blocks'
import { type PropsWithChildren, useSyncExternalStore } from 'react'
import { SET_GLOBALS, UPDATE_GLOBALS } from 'storybook/internal/core-events'
import { addons } from 'storybook/preview-api'

import { docsFrameTheme, docsPageAround } from './docs-frame'
import { molaDarkTheme, molaTheme } from './mola-theme'

/**
 * Docs pages follow the toolbar's theme.
 *
 * They used to stay light on purpose, with only the examples switching, and
 * that read as a broken switch: with Dark selected, a component page kept
 * light prose and a light args table around dark canvases, and a text-only
 * page (Introduction, Foundations) did not change at all.
 *
 * The theme decorator could not fix that alone: an MDX page with no stories
 * never runs decorators. So the preview listens to the globals itself, from
 * the moment it loads, and sets `data-theme` on <html> for every page, which
 * themes the system's own doc blocks; the docs container swaps Storybook's
 * docs theme (prose, args table, code blocks) to match.
 *
 * Which events it listens to is the subtle part. A pattern page renders its
 * examples in iframes (`inline: false`), each a preview of its own whose
 * channel posts to its parent, the docs page; listening to GLOBALS_UPDATED
 * and every SET_GLOBALS, as tried first, let those frames' default light
 * globals overwrite the page's dark ones. So the page takes its starting
 * theme from the first SET_GLOBALS only (its own preview announces it at
 * start-up, before any example frame exists) and changes from UPDATE_GLOBALS,
 * which only the toolbar sends.
 *
 * Those example frames get no globals from Storybook and so would always be
 * light. A frame that finds itself inside a docs page takes the page's
 * `data-theme` instead (the decorator asks `docsFrameTheme()`), and follows it
 * when it changes. Mirroring it into the frame's globals was tried first and
 * looped: the frame's UPDATE_GLOBALS reached the docs page too, which
 * re-rendered its examples, whose new frames sent it again.
 */
type Theme = 'light' | 'dark'
type GlobalsPayload = { globals?: Record<string, unknown> }

let current: Theme | undefined
const listeners = new Set<() => void>()

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  if (theme === current) return
  current = theme
  for (const listener of listeners) listener()
}

const themeOf = (globals: Record<string, unknown> | undefined): Theme | undefined =>
  globals?.theme === 'dark' ? 'dark' : globals?.theme === 'light' ? 'light' : undefined

const page = docsPageAround()
if (page) {
  new MutationObserver(() => {
    const theme = docsFrameTheme()
    if (theme) document.documentElement.dataset.theme = theme
  }).observe(page.documentElement, { attributeFilter: ['data-theme'] })
}

void addons.ready().then((channel) => {
  // An example frame inside a docs page takes the page's theme instead.
  if (page) return
  channel.once(SET_GLOBALS, ({ globals }: GlobalsPayload) => apply(themeOf(globals) ?? 'light'))
  channel.on(UPDATE_GLOBALS, ({ globals }: GlobalsPayload) => {
    const theme = themeOf(globals)
    if (theme) apply(theme)
  })
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function ThemedDocsContainer(props: PropsWithChildren<DocsContainerProps>) {
  const theme = useSyncExternalStore(
    subscribe,
    () => current ?? 'light',
    () => 'light' as const,
  )
  return <DocsContainer {...props} theme={theme === 'dark' ? molaDarkTheme : molaTheme} />
}
