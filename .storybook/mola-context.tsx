import { DirectionProvider } from '@base-ui/react/direction-provider'
import type { Decorator } from '@storybook/react-vite'
import { type ReactNode, useEffect } from 'react'

import { docsFrameTheme } from './docs-frame'

type Theme = 'light' | 'dark'
type Density = 'compact' | 'comfortable' | 'spacious'
type Direction = 'ltr' | 'rtl'

/**
 * Theme and density are document attributes, not React context, because the
 * system is: a dialog portals to <body>, and a context provider would leave it
 * in the light theme while the page behind it went dark.
 *
 * On a docs page the theme goes on <html> too, so the page around the
 * examples follows the toolbar (docs-theme.tsx does the same for MDX pages,
 * which run no decorators). Density and direction go only on each story's
 * own frame: the documentation's prose keeps its reading size and direction
 * while the examples inside it switch.
 *
 * Direction is both. `dir` is a document attribute for the same reason as
 * theme — a portaled menu has to lay out right-to-left too — but Base UI
 * reads keyboard direction (arrow keys in a slider, tabs, a menu, which side
 * a submenu opens) from React context, not from the DOM, so the story is
 * also wrapped in its DirectionProvider. A consumer does the same: `dir` on
 * <html> for layout, DirectionProvider at the root for behaviour.
 *
 * This lives apart from preview.tsx so src/test/ssr-stories.test.tsx can
 * compose every story on a server through the same decorator: preview.tsx
 * also loads the docs page and Storybook's doc blocks, which need a
 * `document` just to import.
 */
function MolaContext({
  theme,
  density,
  direction,
  inDocs,
  children,
}: {
  theme: Theme
  density: Density
  direction: Direction
  inDocs: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const root = document.documentElement
    if (inDocs) {
      root.dataset.theme = theme
      root.dataset.density = 'comfortable'
      root.dir = 'ltr'
      return
    }
    root.dataset.theme = theme
    root.dataset.density = density
    root.dir = direction
  }, [theme, density, direction, inDocs])

  if (inDocs) {
    return (
      <DirectionProvider direction={direction}>
        <div data-theme={theme} data-density={density} dir={direction} className="bg-cloth p-6 text-ink">
          {children}
        </div>
      </DirectionProvider>
    )
  }
  return <DirectionProvider direction={direction}>{children}</DirectionProvider>
}

export const withMolaContext: Decorator = (Story, context) => (
  <MolaContext
    // An example rendered in its own iframe on a docs page (a pattern's)
    // gets no globals from Storybook; it takes the page's theme.
    theme={docsFrameTheme() ?? (context.globals.theme as Theme)}
    density={context.globals.density as Density}
    direction={(context.globals.direction as Direction | undefined) ?? 'ltr'}
    inDocs={context.viewMode === 'docs'}
  >
    <Story />
  </MolaContext>
)

/** The globals every story starts from. */
export const initialGlobals = { theme: 'light', density: 'comfortable', direction: 'ltr' }
