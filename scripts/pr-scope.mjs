#!/usr/bin/env node
// The scope half of the `Conventional PR title` check (pr-title.yml):
//
//   node scripts/pr-scope.mjs "feat(button): add a size"
//
// Fails when the title's scope is in neither SCOPE_PAGES nor
// NON_COMPONENT_SCOPES, on the pull request that introduces it rather than on
// the release PR that first carries it into CHANGELOG.md (#141, #143). The
// tables stay in changes.ts, read here through Node's type stripping (on by
// default from Node 22.18), so there is no second list to keep in step and the
// workflow needs no node_modules.
import { titleScopeError } from '../src/docs/usage/changes.ts'

const title = process.argv[2] ?? process.env.TITLE
if (title === undefined) {
  console.error('usage: node scripts/pr-scope.mjs "<pull request title>"')
  process.exit(2)
}
const error = titleScopeError(title)
if (error) {
  console.log(process.env.GITHUB_ACTIONS ? `::error title=Unknown PR title scope::${error}` : error)
  process.exit(1)
}
console.log(`Scope check passed: ${title}`)
