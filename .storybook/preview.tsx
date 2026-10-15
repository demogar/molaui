import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/alegreya/wght-italic.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './preview.css'

import type { Preview } from '@storybook/react-vite'

import { DocsPage } from './docs-page'
import { ThemedDocsContainer } from './docs-theme'
import { initialGlobals, withMolaContext } from './mola-context'

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
  initialGlobals,
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: { expanded: true, sort: 'requiredFirst' },
    docs: {
      container: ThemedDocsContainer,
      page: DocsPage,
      // The table of contents lists the page's own sections. Headings inside
      // a rendered example (`.sb-story`, in an example's frame or the
      // anatomy diagram: an empty state's title, a settings section) belong
      // to the example, and listed beside the page's they read as sections
      // of the documentation.
      toc: {
        headingSelector: 'h2, h3',
        ignoreSelector: '[data-usage] h3, [data-a11y] h3, [data-related] h3, .sb-story h2, .sb-story h3',
      },
    },
    a11y: { test: 'error' },
    options: {
      storySort: {
        order: [
          'Mola UI',
          [
            'Introduction',
            'Getting started',
            'Choosing a component',
            'Principles',
            'Versioning',
            'Known gaps',
            'References',
            // Newest first, as WHATS_NEW in src/docs/usage/whats-new.ts; changes.test.ts holds the two together.
            "What's new",
            ['0.6', '0.5', '0.4', '0.3', '0.2'],
            'Changelog',
          ],
          'Foundations',
          ['Color', 'Typography', 'Spacing', 'Density', 'The cut', 'Layers and elevation', 'Motion', 'Iconography', 'Content and voice', 'Accessibility', 'Tokens'],
          'Decisions',
          ['All decisions'],
          'Components',
          'AI',
          'Patterns',
        ],
      },
    },
  },
}

export default preview
