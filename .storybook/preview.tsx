import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/alegreya/wght-italic.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './preview.css'

import type { Decorator, Preview } from '@storybook/react-vite'
import { type ReactNode, useEffect } from 'react'

import { molaTheme } from './mola-theme'

type Theme = 'light' | 'dark'
type Density = 'compact' | 'comfortable' | 'spacious'

/**
 * Theme and density are document attributes, not React context, because the
 * system is: a dialog portals to <body>, and a context provider would leave it
 * in the light theme while the page behind it went dark.
 *
 * On a docs page the attributes go on each story's own frame instead, so the
 * documentation chrome stays readable while the examples inside it switch.
 */
function MolaContext({
  theme,
  density,
  inDocs,
  children,
}: {
  theme: Theme
  density: Density
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
      return
    }
    root.dataset.theme = theme
    root.dataset.density = density
  }, [theme, density, inDocs])

  if (inDocs) {
    return (
      <div data-theme={theme} data-density={density} className="bg-cloth p-6 text-ink">
        {children}
      </div>
    )
  }
  return children
}

const withMolaContext: Decorator = (Story, context) => (
  <MolaContext
    theme={context.globals.theme as Theme}
    density={context.globals.density as Density}
    inDocs={context.viewMode === 'docs'}
  >
    <Story />
  </MolaContext>
)

const preview: Preview = {
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
  },
  initialGlobals: { theme: 'light', density: 'comfortable' },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true, sort: 'requiredFirst' },
    docs: { theme: molaTheme, toc: { headingSelector: 'h2, h3' } },
    a11y: { test: 'error' },
    options: {
      storySort: {
        order: [
          'Mola UI',
          ['Introduction', 'Getting started', 'Principles', 'References', 'Changelog'],
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
