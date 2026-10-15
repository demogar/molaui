// The setup the README documents: the plugin's recommended config, over JSX
// parsed by ESLint's own parser. No TypeScript parser, because the rules read
// the source text and need none.
import mola from '@demogar/mola-ui/eslint'

export default [
  {
    files: ['src/**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  mola.configs.recommended,
]
