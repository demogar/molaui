/**
 * Per-component changes, read from CHANGELOG.md.
 *
 * release-please writes CHANGELOG.md from the conventional-commit titles of
 * squash-merged pull requests, so every entry already carries a scope:
 * `* **callout:** add a flat variant (#20) (fc8a390)`. This module parses that
 * file and decides which component pages each entry belongs to. It is pure
 * (it takes the Markdown as a string) so the docs blocks can pass it the
 * `?raw` import and the tests and scripts can pass it the file they read:
 * there is one changelog, never a second copy to keep in step.
 *
 * Scopes map to pages through SCOPE_PAGES, written out by hand rather than
 * derived from the folder names. Deriving was tried first and fails on the
 * cases that matter: `alert-dialog` lives in the dialog folder, `data-table`
 * and `date-range-picker` are exports of other pages, and `layout` is one
 * folder behind five pages. A scope that is not a component (docs, theme,
 * tokens) is listed in NON_COMPONENT_SCOPES with the reason, and
 * changes.test.ts fails on any scope in CHANGELOG.md that is in neither, so a
 * new scope cannot silently drop entries from a page. That test only sees a
 * scope once release-please has written it into the release PR, the one PR
 * whose failure blocks a release (#141), so the `Conventional PR title`
 * workflow also runs titleScopeError() on every pull request title
 * (scripts/pr-scope.mjs) and fails the PR that brings the scope in.
 *
 * Some entries were merged under a cross-cutting scope even though their
 * subject names components, such as `feat(components): add combobox, date
 * pickers…`. COMMIT_PAGES attaches those by commit, checked against the
 * changelog by the same test, so the components they added say so on their
 * own pages.
 */

export type ChangeType = 'feature' | 'fix' | 'performance' | 'docs' | 'other'

export interface ChangeEntry {
  version: string
  /** ISO date of the release, as release-please writes it. */
  date?: string
  type: ChangeType
  /** Listed under ⚠ BREAKING CHANGES as well as (or instead of) its own section. */
  breaking: boolean
  scopes: string[]
  /** The commit subject, Markdown inline code kept as written. */
  subject: string
  pr?: { number: number; url: string }
  commit?: { sha: string; url: string }
}

export interface Release {
  version: string
  date?: string
  compareUrl?: string
  entries: ChangeEntry[]
}

/**
 * The section headings release-please writes, and what each means here. A
 * heading not in this list fails changes.test.ts rather than being guessed.
 */
export const SECTION_TYPES: Record<string, ChangeType | 'breaking'> = {
  Features: 'feature',
  'Bug Fixes': 'fix',
  'Performance Improvements': 'performance',
  // release-please-config.json renames these three sections; the default
  // headings stay for entries written before the rename.
  Performance: 'performance',
  Refactoring: 'other',
  CI: 'other',
  Documentation: 'docs',
  '⚠ BREAKING CHANGES': 'breaking',
  Reverts: 'other',
  'Code Refactoring': 'other',
  Tests: 'other',
  'Build System': 'other',
  'Continuous Integration': 'other',
  Miscellaneous: 'other',
  'Miscellaneous Chores': 'other',
}

const RELEASE = /^#{2,3} \[?(\d+\.\d+\.\d+(?:-[\w.]+)?)\]?(?:\(([^)]+)\))?(?: \((\d{4}-\d{2}-\d{2})\))?\s*$/
const SECTION = /^### (.+?)\s*$/
const ENTRY = /^\* (.+)$/
const SCOPE = /^\*\*([^*]+?):\*\*\s*/
const PR = /\(\[#(\d+)\]\(([^)]+)\)\)/
const COMMIT = /\(\[([0-9a-f]{7,40})\]\(([^)]+)\)\)/

export function parseChangelog(raw: string): Release[] {
  const releases: Release[] = []
  let release: Release | undefined
  let section: ChangeType | 'breaking' | undefined
  const breakingShas = new Map<Release, Set<string>>()
  for (const line of raw.split(/\r?\n/)) {
    const head = RELEASE.exec(line)
    if (head) {
      release = { version: head[1]!, compareUrl: head[2], date: head[3], entries: [] }
      releases.push(release)
      breakingShas.set(release, new Set())
      section = undefined
      continue
    }
    const sec = SECTION.exec(line)
    if (sec) {
      section = SECTION_TYPES[sec[1]!] ?? 'other'
      continue
    }
    const item = ENTRY.exec(line)
    if (!item || !release || !section) continue
    let text = item[1]!
    const scope = SCOPE.exec(text)
    const scopes = scope ? scope[1]!.split(',').map((s) => s.trim()).filter(Boolean) : []
    if (scope) text = text.slice(scope[0].length)
    const pr = PR.exec(text)
    const commit = COMMIT.exec(text)
    const subject = text.replace(PR, '').replace(COMMIT, '').trim()
    const entry: ChangeEntry = {
      version: release.version,
      date: release.date,
      type: section === 'breaking' ? 'other' : section,
      breaking: section === 'breaking',
      scopes,
      subject,
      ...(pr ? { pr: { number: Number(pr[1]), url: pr[2]! } } : {}),
      ...(commit ? { commit: { sha: commit[1]!.slice(0, 7), url: commit[2]! } } : {}),
    }
    if (section === 'breaking' && entry.commit) breakingShas.get(release)!.add(entry.commit.sha)
    release.entries.push(entry)
  }
  // release-please lists a breaking commit twice: in its own section and
  // under ⚠ BREAKING CHANGES. Keep the one in its own section, marked
  // breaking, so a page shows it once with its real type.
  for (const r of releases) {
    const shas = breakingShas.get(r)!
    const typed = new Set(r.entries.filter((e) => !e.breaking && e.commit).map((e) => e.commit!.sha))
    r.entries = r.entries
      .filter((e) => !(e.breaking && e.commit && typed.has(e.commit.sha)))
      .map((e) => (e.commit && shas.has(e.commit.sha) ? { ...e, breaking: true } : e))
  }
  return releases
}

/** Every `### heading` under a release that SECTION_TYPES does not name. */
export function unknownSections(raw: string): string[] {
  return [...raw.matchAll(/^### (.+?)\s*$/gm)]
    .map((m) => m[1]!)
    .filter((h) => !RELEASE.test(`### ${h}`) && !(h in SECTION_TYPES))
}

const F = 'Components/Forms/'
const L = 'Components/Layout/'
const T = 'Components/Typography/'

/**
 * Conventional-commit scope → the component pages it changes. Keys are the
 * folder or export names a commit would use; aliases sit with their page.
 */
export const SCOPE_PAGES: Record<string, string[]> = {
  accordion: ['Components/Navigation/Accordion'],
  'app-shell': [`${L}App shell`],
  sidebar: [`${L}App shell`],
  'page-header': [`${L}Page header`],
  avatar: ['Components/Data display/Avatar'],
  badge: ['Components/Feedback/Badge'],
  breadcrumb: ['Components/Navigation/Breadcrumb'],
  button: ['Components/Actions/Button'],
  callout: ['Components/Feedback/Callout'],
  checkbox: [`${F}Checkbox`],
  chip: [`${F}Chip`],
  code: ['Components/Data display/Code'],
  combobox: [`${F}Combobox`],
  autocomplete: [`${F}Combobox`],
  command: ['Components/Overlays/Command palette'],
  'command-palette': ['Components/Overlays/Command palette'],
  'date-picker': [`${F}Date picker`],
  'date-range-picker': [`${F}Date picker`],
  calendar: [`${F}Date picker`],
  'description-list': ['Components/Data display/Description list'],
  dialog: ['Components/Overlays/Dialog'],
  'alert-dialog': ['Components/Overlays/Dialog'],
  drawer: ['Components/Overlays/Drawer'],
  'empty-state': ['Components/Feedback/Empty state'],
  field: [`${F}Field`],
  input: [`${F}Field`],
  textarea: [`${F}Field`],
  'file-upload': [`${F}File upload`],
  layout: [`${L}Container`, `${L}Divider`, `${L}Grid`, `${L}Panel`, `${L}Stack`],
  container: [`${L}Container`],
  divider: [`${L}Divider`],
  grid: [`${L}Grid`],
  panel: [`${L}Panel`],
  stack: [`${L}Stack`],
  menu: ['Components/Overlays/Menu'],
  'number-input': [`${F}Number input`],
  pagination: ['Components/Navigation/Pagination'],
  placeholder: ['Components/Feedback/Placeholder'],
  popover: ['Components/Overlays/Popover'],
  progress: ['Components/Feedback/Progress'],
  radio: [`${F}Radio`],
  segmented: [`${F}Segmented control`],
  'segmented-control': [`${F}Segmented control`],
  select: [`${F}Select`],
  skeleton: ['Components/Feedback/Skeleton'],
  slider: [`${F}Slider`],
  stat: ['Components/Data display/Stat'],
  swatch: ['Components/Data display/Swatch'],
  switch: [`${F}Switch`],
  table: ['Components/Data display/Table'],
  'data-table': ['Components/Data display/Table'],
  tabs: ['Components/Navigation/Tabs'],
  timeline: ['Components/Data display/Timeline'],
  toast: ['Components/Feedback/Toast'],
  toolbar: [`${L}Toolbar`],
  tooltip: ['Components/Overlays/Tooltip'],
  typography: [
    `${T}Display`,
    `${T}Heading`,
    `${T}Kbd`,
    `${T}Lead`,
    `${T}Meta`,
    `${T}Prose`,
    `${T}Pullquote`,
    `${T}Rotulo`,
    `${T}Text`,
  ],
  display: [`${T}Display`],
  heading: [`${T}Heading`],
  kbd: [`${T}Kbd`],
  lead: [`${T}Lead`],
  meta: [`${T}Meta`],
  prose: [`${T}Prose`],
  pullquote: [`${T}Pullquote`],
  rotulo: [`${T}Rotulo`],
  text: [`${T}Text`],
  'agent-run': ['AI/Agent run'],
  'change-review': ['AI/Change review'],
  confidence: ['AI/Confidence'],
  message: ['AI/Message'],
  thread: ['AI/Message'],
  'prompt-input': ['AI/Prompt input'],
  reasoning: ['AI/Reasoning'],
  'run-error': ['AI/Run error'],
  'run-status': ['AI/Run status'],
  sources: ['AI/Sources'],
  citation: ['AI/Sources'],
  'streaming-text': ['AI/Streaming text'],
  'token-usage': ['AI/Token usage'],
  'tool-call': ['AI/Tool call'],
}

/**
 * Scopes that are not one component, and why their entries stay on the
 * Changelog page instead of a component page.
 */
export const NON_COMPONENT_SCOPES: Record<string, string> = {
  components: 'the component layer as a whole; entries that name components are attached by COMMIT_PAGES',
  ai: 'the AI layer as a whole; entries that name components are attached by COMMIT_PAGES',
  a11y: 'accessibility work across every component, such as forced colours',
  rtl: 'right-to-left support across every component',
  tokens: 'design tokens, documented on the Foundations pages',
  theme: 'theming across the whole system',
  docs: 'the documentation site',
  adr: 'the architecture decision records in docs/adr',
  foundations: 'the Foundations pages',
  patterns: 'whole Cayuco screens, which are not components',
  stories: 'story fixtures and demo data',
  readme: 'the README',
  lib: 'internal helpers such as cn()',
  deps: 'dependency updates',
  'deps-dev': "Dependabot's development dependency updates",
  dependabot: 'the Dependabot configuration',
  main: "release-please's release pull request, scoped by its branch",
  scripts: 'build and audit scripts',
  tooling: 'build, lint and test tooling',
  ci: 'continuous integration',
  visual: 'visual regression baselines',
  release: 'the release process',
  mcp: 'the mola-ui-mcp server, which serves the docs rather than rendering a component',
  storybook: 'the Storybook site itself, such as its loading and theming',
  'known-gaps': 'the Known gaps page',
  'whats-new': "the What's new pages",
  audit: 'the browser audit script',
  package: 'the package boundary: package.json, exports, peers and engines',
  styles: 'the shipped stylesheets as a whole, such as components.css',
}

/**
 * Entries merged under a cross-cutting scope whose subject names the
 * components they changed, keyed by the short commit sha. Only for the
 * components the subject names; a sweep that touched everything stays on the
 * Changelog page.
 */
export const COMMIT_PAGES: Record<string, string[]> = {
  // feat(components): add combobox, date pickers, number input, file upload,
  // skeleton, drawer, toolbar and data table features (#11)
  aeacb52: [
    `${F}Combobox`,
    `${F}Date picker`,
    `${F}Number input`,
    `${F}File upload`,
    'Components/Feedback/Skeleton',
    'Components/Overlays/Drawer',
    `${L}Toolbar`,
    'Components/Data display/Table',
  ],
  // feat(ai): add change approval, citation cards and run recovery (#13)
  a15d16e: ['AI/Change review', 'AI/Sources', 'AI/Run error', 'AI/Agent run'],
  // feat(callout): add a flat variant and a swatch colour key (#20)
  fc8a390: ['Components/Data display/Swatch'],
}

/** The component pages an entry belongs to. */
export function pagesFor(entry: ChangeEntry): string[] {
  const pages = [
    ...entry.scopes.flatMap((scope) => SCOPE_PAGES[scope] ?? []),
    ...(entry.commit ? (COMMIT_PAGES[entry.commit.sha] ?? []) : []),
  ]
  return [...new Set(pages)]
}

/** A component page's entries, newest release first, as the changelog orders them. */
export function changesFor(title: string, releases: Release[]): ChangeEntry[] {
  return releases.flatMap((r) => r.entries.filter((e) => pagesFor(e).includes(title)))
}

/** Scopes that are neither a component nor declared as something else. */
export function unknownScopes(releases: Release[]): string[] {
  const scopes = releases.flatMap((r) => r.entries.flatMap((e) => e.scopes))
  return [...new Set(scopes)].filter((s) => !(s in SCOPE_PAGES) && !(s in NON_COMPONENT_SCOPES))
}

const parts = (v: string) => v.split(/[.-]/).slice(0, 3).map(Number)

/** -1, 0 or 1, comparing major.minor.patch only. */
export function compareVersions(a: string, b: string) {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) {
    if (x[i]! !== y[i]!) return x[i]! < y[i]! ? -1 : 1
  }
  return 0
}

/**
 * A release is out when package.json has reached it. release-please bumps
 * package.json and writes CHANGELOG.md in the same commit, so a What's new
 * page drafted ahead of a release flips to released on its own.
 */
export function isReleased(version: string, current: string) {
  return compareVersions(version, current) <= 0
}

/** The minor line a version belongs to: "0.4.2" → "0.4". */
export const minorOf = (version: string) => version.split('.').slice(0, 2).join('.')

const TITLE = /^\w+(?:\(([^)]*)\))?!?: /

/**
 * The scopes of a conventional-commit title (`feat(a,b): …` gives a and b),
 * split on commas as the changelog parser splits them. A title with no scope,
 * or one that is not conventional at all, has none: the title's shape is the
 * semantic-PR action's check, not this one.
 */
export function titleScopes(title: string): string[] {
  const scope = TITLE.exec(title)?.[1]
  return scope
    ? scope
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
}

/**
 * Why a pull request title's scope would fail the next release, or undefined
 * when every scope is declared. The message names the file and both tables,
 * because the fix is to declare the scope (or drop it), not to rename it to
 * whatever happens to pass.
 */
export function titleScopeError(title: string): string | undefined {
  const unknown = titleScopes(title).filter((s) => !(s in SCOPE_PAGES) && !(s in NON_COMPONENT_SCOPES))
  if (unknown.length === 0) return undefined
  const list = unknown.map((s) => `"${s}"`).join(', ')
  return (
    `Unknown scope ${list} in the pull request title. Declare it in src/docs/usage/changes.ts: ` +
    `in SCOPE_PAGES with the component pages it changes, or in NON_COMPONENT_SCOPES with what it covers. ` +
    `Or use a declared scope, or none. An undeclared scope reaches no component page, and the release PR ` +
    `that carries it into CHANGELOG.md fails changes.test.ts.`
  )
}
