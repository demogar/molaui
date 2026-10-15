// The ESLint plugin as an app installs it: `@demogar/mola-ui/eslint` resolved
// through the tarball's `exports` map, loaded by the app's own ESLint 9 from
// eslint.config.js, linting a file that breaks the rules and one that keeps
// them. Run by scripts/consumers.mjs (`npm run check` in this fixture).
import { createRequire } from 'node:module'

import { ESLint } from 'eslint'

const errors = []
const resolved = import.meta.resolve('@demogar/mola-ui/eslint')
if (!/\/node_modules\/@demogar\/mola-ui\/dist\/eslint\/index\.js$/.test(resolved)) {
  errors.push(`@demogar/mola-ui/eslint resolved to ${resolved}, not the installed package's dist/eslint/index.js`)
}
const { version } = createRequire(import.meta.url)('@demogar/mola-ui/package.json')
const plugin = (await import('@demogar/mola-ui/eslint')).default
if (plugin.meta?.version !== version) errors.push(`plugin.meta.version is ${plugin.meta?.version}, the package is ${version}`)

const eslint = new ESLint({ cwd: import.meta.dirname })
const results = await eslint.lintFiles(['src'])
const byFile = Object.fromEntries(
  results.map((r) => [r.filePath.split('/').pop(), r.messages.map((m) => `${m.line} ${m.ruleId} ${m.message.split(':')[0]}`)]),
)

const expected = {
  'bad.jsx': [
    '2 mola-ui/design-rules Rule 12', // `Buton` is not exported: a guessed name
    '7 mola-ui/design-advice Rule 12', // a hand-styled <button> where Button exists
    '7 mola-ui/design-rules Rule 1', // a border on a control
    '7 mola-ui/design-rules Rule 2', // a radius
    '10 mola-ui/design-rules Rule 5', // a hex colour in a style
  ],
  'good.jsx': [],
}
for (const [file, want] of Object.entries(expected)) {
  const got = byFile[file]
  if (!got) errors.push(`${file} was not linted`)
  else if (JSON.stringify(got) !== JSON.stringify(want)) errors.push(`${file}: expected\n  ${want.join('\n  ')}\ngot\n  ${got.join('\n  ')}`)
}
const bad = results.find((r) => r.filePath.endsWith('bad.jsx'))
if (bad && (bad.errorCount !== 4 || bad.warningCount !== 1)) errors.push(`bad.jsx: ${bad.errorCount} errors and ${bad.warningCount} warnings, expected 4 and 1`)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`eslint plugin ${version}: bad.jsx reported as expected, good.jsx clean`)
