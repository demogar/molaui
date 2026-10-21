#!/usr/bin/env node
// The repo half of the `Conventional PR title` check (pr-title.yml):
//
//   node scripts/pr-scope.mjs "feat(button): add a size"
//
// Fails when the title's scope is in neither SCOPE_PAGES nor
// NON_COMPONENT_SCOPES, on the pull request that introduces it rather than on
// the release PR that first carries it into CHANGELOG.md (#141, #143). For the
// same reason it fails a title that starts a new minor (a `feat` or a breaking
// change) when that minor has no What's new page (#178). The tables stay in
// changes.ts, read here through Node's type stripping (on by default from Node
// 22.18), so there is no second list to keep in step and the workflow needs no
// node_modules.
import { readFileSync } from 'node:fs'

import { titleScopeError, titleWhatsNewError, WHATS_NEW } from '../src/docs/usage/changes.ts'

const title = process.argv[2] ?? process.env.TITLE
if (title === undefined) {
  console.error('usage: node scripts/pr-scope.mjs "<pull request title>"')
  process.exit(2)
}
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const errors = [
  ['Unknown PR title scope', titleScopeError(title)],
  ["No What's new page", titleWhatsNewError(title, version, WHATS_NEW)],
].filter(([, error]) => error)
for (const [heading, error] of errors) {
  console.log(process.env.GITHUB_ACTIONS ? `::error title=${heading}::${error}` : error)
}
if (errors.length > 0) process.exit(1)
console.log(`PR title check passed: ${title}`)
