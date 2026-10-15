import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/alegreya/wght-italic.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './preview.css'

import type { Preview } from '@storybook/react-vite'

import { DocsPage } from './docs-page'
import { ThemedDocsContainer } from './docs-theme'
import { initialGlobals, withMolaContext } from './mola-context'
import { TOC_IGNORE, withHeadingId } from './toc'

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
      // The table of contents lists the page's own sections, and every entry
      // scrolls to its heading. toc.ts says what is left out and why every
      // heading needs an id.
      toc: {
        headingSelector: 'h2, h3',
        ignoreSelector: TOC_IGNORE,
        unsafeTocbotOptions: { headingObjectCallback: withHeadingId },
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
            'Migration',
            'Codemods',
            'Known gaps',
            'Roadmap',
            'References',
            // Newest first, as WHATS_NEW in src/docs/usage/whats-new.ts; changes.test.ts holds the two together.
            "What's new",
            ['0.7', '0.6', '0.5', '0.4', '0.3', '0.2'],
            'Changelog',
          ],
          'Foundations',
          ['Color', 'Typography', 'Spacing', 'Density', 'Responsive', 'The cut', 'Layers and elevation', 'Motion', 'Iconography', 'Data visualisation', 'Content and voice', 'Internationalisation', 'Accessibility', 'Theming', 'Tokens'],
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
