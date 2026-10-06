import type { StorybookConfig } from '@storybook/react-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  // llms.txt and llms-full.txt live at the repository root, where agents
  // reading the source look for them, and are served at the site root too.
  staticDirs: [
    '../public',
    { from: '../llms.txt', to: '/llms.txt' },
    { from: '../llms-full.txt', to: '/llms-full.txt' },
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
