import { addons } from 'storybook/manager-api'

import { molaTheme } from './mola-theme'

addons.setConfig({
  theme: molaTheme,
  sidebar: { showRoots: true },
})
