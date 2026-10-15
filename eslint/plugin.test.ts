// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import { found } from '../src/test/found'
import { checkCode, contextFrom } from '../mcp/check'
import { ALLOWED, files, root, unexcused, type Allowed } from '../mcp/check.allowed'
import { loadData } from '../mcp/data'
import plugin, { format } from './plugin'

/**
 * The gate for #101: the ESLint plugin runs over this repo, through ESLint
 * itself, with the same allowlist as check.library.test.ts
 * (mcp/check.allowed.ts), and agrees with check_code finding for finding.
 *
 * TypeScript goes through typescript-eslint's parser, as in an app. MDX has
 * no parser in this repo's tree (an app would use eslint-mdx); the rules read
 * only the source text, so MDX is parsed to an empty program and the rules
 * still see every line of it.
 */
const ctx = contextFrom(loadData(root))

const mdxParser: Linter.Parser = {
  meta: { name: 'mdx-as-text' },
  parse(text: string) {
    const lines = text.split('\n')
    return {
      type: 'Program',
      body: [],
      sourceType: 'module',
      range: [0, text.length],
      loc: { start: { line: 1, column: 0 }, end: { line: lines.length, column: lines.at(-1)!.length } },
      tokens: [],
      comments: [],
    } as unknown as ReturnType<Extract<Linter.Parser, { parse: unknown }>['parse']>
  },
}

const config: Linter.Config[] = [
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser as Linter.Parser, parserOptions: { ecmaFeatures: { jsx: true } } } },
  { files: ['**/*.mdx'], languageOptions: { parser: mdxParser } },
  plugin.configs.recommended!,
  // An `eslint-disable` in the repo names rules this run does not load, and must not hide a finding from the comparison.
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' } },
]
const linter = new Linter({ configType: 'flat' })

const RULE_ID = { 'mola-ui/design-rules': 'error', 'mola-ui/design-advice': 'warn' } as const

/** ESLint's report of a file, read back into check_code's terms. */
function lint(rel: string, text = readFileSync(join(root, rel), 'utf8')) {
  const lines = text.split('\n')
  const messages = linter.verify(text, config, { filename: join(root, rel) })
  const fatal = messages.find((m) => m.fatal)
  if (fatal) throw new Error(`${rel}:${fatal.line} did not parse: ${fatal.message}`)
  return messages.filter((m) => m.ruleId?.startsWith('mola-ui/')).map((m) => {
    const parsed = /^(?:Rule (\d+)|check_code directive): ([\s\S]*)$/.exec(m.message)
    return {
      rule: Number(parsed?.[1] ?? 0),
      severity: RULE_ID[m.ruleId as keyof typeof RULE_ID],
      line: m.line,
      column: m.column,
      text: m.message,
      message: parsed?.[2] ?? m.message,
      excerpt: (lines[m.line - 1] ?? '').trim(),
    }
  })
}

const sources = found(files, 200, 'sources the plugin lints')
/** Linting some 300 files through ESLint takes a few seconds alone, and longer beside the rest of the suite. */
const SLOW = 60_000
const linted = new Map<string, ReturnType<typeof lint>>()
const lintFile = (rel: string) => linted.get(rel) ?? linted.set(rel, lint(rel)).get(rel)!

describe('the ESLint plugin on the library itself', () => {
  const used = new Set<Allowed>()

  it('finds nothing that is not allowed, with the same allowlist as check_code', () => {
    const left = sources.flatMap((rel) => unexcused(rel, lintFile(rel), used).map((f) => `${rel}:${f.line} ${f.text}`))
    expect(left).toEqual([])
  }, SLOW)

  it('uses every allowance, so the allowlist is not wider than the plugin needs', () => {
    const stale = Object.entries(ALLOWED).flatMap(([rel, entries]) => entries.filter((a) => !used.has(a)).map((a) => `${rel} rule ${a.rule} ${a.match}`))
    expect(stale).toEqual([])
  })

  it('reports what check_code reports, at the same place, with the same grade', () => {
    const differ = sources.filter((rel) => {
      const direct = checkCode(readFileSync(join(root, rel), 'utf8'), ctx, { filename: rel }).map((f) => `${f.line}:${f.column} ${f.severity} ${format(f)}`)
      const viaEslint = lintFile(rel).map((m) => `${m.line}:${m.column} ${m.severity} ${m.text}`)
      return JSON.stringify(direct.sort()) !== JSON.stringify(viaEslint.sort())
    })
    expect(differ).toEqual([])
  }, SLOW)
})

describe('the ESLint plugin on code that breaks the rules', () => {
  const bad = [
    "import { Buton } from '@demogar/mola-ui'",
    '',
    'export function Save() {',
    '  return (',
    '    <div>',
    '      <button className="border rounded-[6px] px-3">Save</button>',
    '      <span style={{ color: \'#333\' }}>Saved</span>',
    '      <Buton />',
    '    </div>',
    '  )',
    '}',
  ].join('\n')

  it('reports each break as an error and each suspicion as a warning, on its line and column', () => {
    const found = lint('src/eslint-fixture.tsx', bad).map((m) => `${m.line}:${m.column} ${m.severity} rule ${m.rule}`)
    expect(found).toEqual([
      '1:1 error rule 12',
      '6:7 warn rule 12',
      '6:26 error rule 1',
      '6:33 error rule 2',
      '7:30 error rule 5',
    ])
  })

  it('honours a check_code allow with a reason, and only with one', () => {
    const allowed = '// check_code: allow rule 2 — a specimen of what the rule forbids\n<div className="rounded-3xl" />'
    expect(lint('src/eslint-fixture.tsx', allowed)).toEqual([])
    const bare = '// check_code: allow rule 2\n<div className="rounded-3xl" />'
    expect(lint('src/eslint-fixture.tsx', bare).map((m) => `${m.line} ${m.severity} rule ${m.rule}`)).toEqual(['1 error rule 0', '2 error rule 2'])
  })

  it('names its rules and its recommended config', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(['design-advice', 'design-rules'])
    expect(plugin.configs.recommended?.rules).toEqual({ 'mola-ui/design-rules': 'error', 'mola-ui/design-advice': 'warn' })
    expect(plugin.meta.version).toBe(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version)
  })
})
