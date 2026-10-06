import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/alegreya/wght-italic.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './preview.css'

import { DirectionProvider } from '@base-ui/react/direction-provider'
import type { Decorator, Preview } from '@storybook/react-vite'
import { type ReactNode, useEffect } from 'react'

import { DocsPage } from './docs-page'
import { molaTheme } from './mola-theme'

type Theme = 'light' | 'dark'
type Density = 'compact' | 'comfortable' | 'spacious'
type Direction = 'ltr' | 'rtl'

/**
 * Theme and density are document attributes, not React context, because the
 * system is: a dialog portals to <body>, and a context provider would leave it
 * in the light theme while the page behind it went dark.
 *
 * On a docs page the attributes go on each story's own frame instead, so the
 * documentation chrome stays readable while the examples inside it switch.
 *
 * Direction is both. `dir` is a document attribute for the same reason as
 * theme — a portaled menu has to lay out right-to-left too — but Base UI
 * reads keyboard direction (arrow keys in a slider, tabs, a menu, which side
 * a submenu opens) from React context, not from the DOM, so the story is
 * also wrapped in its DirectionProvider. A consumer does the same: `dir` on
 * <html> for layout, DirectionProvider at the root for behaviour.
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
      // The documentation chrome is always the light theme; only the
      // examples inside it follow the toolbar.
      root.dataset.theme = 'light'
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

const withMolaContext: Decorator = (Story, context) => (
  <MolaContext
    theme={context.globals.theme as Theme}
    density={context.globals.density as Density}
    direction={(context.globals.direction as Direction | undefined) ?? 'ltr'}
    inDocs={context.viewMode === 'docs'}
  >
    <Story />
  </MolaContext>
)

const preview: Preview = {
  // Every component gets a docs page: its decisions, its usage guidance, its
  // props and every story. The page template adds the Usage section.
  tags: ['autodocs'],
  decorators: [withMolaContext],
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light — bleached cotton', icon: 'sun' },
          { value: 'dark', title: 'Dark — dyed base layer', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: 'Density',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'compact', title: 'Compact — data-heavy tools' },
          { value: 'comfortable', title: 'Comfortable — product default' },
          { value: 'spacious', title: 'Spacious — the editorial metric' },
        ],
        dynamicTitle: true,
      },
    },
    direction: {
      description: 'Reading direction',
      toolbar: {
        title: 'Direction',
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'Left to right' },
          { value: 'rtl', title: 'Right to left' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light', density: 'comfortable', direction: 'ltr' },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true, sort: 'requiredFirst' },
    docs: { theme: molaTheme, page: DocsPage, toc: { headingSelector: 'h2, h3', ignoreSelector: '[data-usage] h3' } },
    a11y: { test: 'error' },
    options: {
      storySort: {
        order: [
          'Mola UI',
          ['Introduction', 'Getting started', 'Choosing a component', 'Principles', 'Versioning', 'References', 'Changelog'],
          'Foundations',
          ['Color', 'Typography', 'The cut', 'Density', 'Motion', 'Iconography', 'Accessibility'],
          'Components',
          'AI',
          'Patterns',
        ],
      },
    },
  },
}

export default preview
