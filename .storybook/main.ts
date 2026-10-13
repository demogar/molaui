import type { StorybookConfig } from '@storybook/react-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  // The llms*.txt files live at the repository root, where agents reading the
  // source look for them, and are served at the site root too. docs/ai/md
  // holds a Markdown twin of every docs page, served as md/<page id>.md; the
  // Copy for LLM button on a component page copies its twin.
  staticDirs: [
    '../public',
    ...['llms.txt', 'llms-full.txt', 'llms-components.txt', 'llms-tokens.txt', 'llms-patterns.txt'].map((file) => ({
      from: `../${file}`,
      to: `/${file}`,
    })),
    { from: '../docs/ai/md', to: '/md' },
    // The changelog's twin is CHANGELOG.md itself (SERVED_AS_IS in scripts/agent-docs.ts).
    { from: '../CHANGELOG.md', to: '/md/mola-ui-changelog--overview.md' },
  ],
  addons: [
    {
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  docs: { defaultName: 'Overview' },
  typescript: { reactDocgen: 'react-docgen-typescript' },
  // The library build's declaration and file-copy plugins have no business in
  // a Storybook build: they only add time and write into dist/.
  viteFinal: (config) => ({
    ...config,
    plugins: (config.plugins ?? []).flat().filter((plugin) => {
      const name = plugin && typeof plugin === 'object' && 'name' in plugin ? plugin.name : ''
      return !/dts|mola:copy-source-styles/.test(String(name))
    }),
  }),
}

export default config
