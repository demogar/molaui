import type { StorybookConfig } from '@storybook/react-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
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
