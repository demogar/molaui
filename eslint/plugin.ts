import type { ESLint, Linter, Rule } from 'eslint'

import { checkCode, contextFrom, type CheckContext, type Finding, type Severity } from '../mcp/check'
import { loadData } from '../mcp/data'

/**
 * `@demogar/mola-ui/eslint`: the MCP `check_code` rules in the consumer's
 * editor and CI. Built by vite.eslint.config.ts into dist/eslint/index.js.
 *
 * There is no second copy of the rules. Each rule calls `checkCode` from
 * mcp/check.ts, the same function the MCP tool calls, on the file's source
 * text, and reports its findings where they are. The checker is a JSX-aware
 * scanner rather than an AST walk, so the plugin reads `sourceCode.text` and
 * never the parser's tree: it works under espree, typescript-eslint or
 * eslint-mdx alike, and a `.tsx` file gets exactly the findings check_code
 * would give it. Rewriting each rule as an ESLint visitor was the
 * alternative, and it would have been fourteen rules to keep in step with
 * the scanner by hand.
 *
 * Two ESLint rules, not one per design rule. check_code already grades each
 * finding: `error` breaks a rule in every context, `warn` is very probably
 * wrong but the code cannot prove it. ESLint's severity belongs to a rule,
 * not to a report, so one rule per design rule would have had to call a
 * suspected radius and a hex literal by the same name and the same severity.
 * `design-rules` carries the errors and `design-advice` the warnings, and
 * `recommended` sets them to `error` and `warn`. A single finding is
 * excused the same way it is for the MCP tool, with
 * `// check_code: allow rule N — the reason` above it, or with
 * `eslint-disable-next-line`.
 *
 * Token names and exports come from docs/ai/components.json in the installed
 * package (mcp/data.ts finds it above this file), so the rules know the names
 * of exactly the version installed beside them.
 *
 * Nothing is imported from `eslint` at run time, only its types, so the
 * plugin bundles no package and declares no dependency: the app's own ESLint
 * (9 or later, flat config) loads it.
 */

const data = loadData()
const ctx: CheckContext = contextFrom(data)

/** One check per file, shared by both rules: they lint the same SourceCode object. */
const findings = new WeakMap<object, Finding[]>()
function findingsFor(rule: Rule.RuleContext): Finding[] {
  const { sourceCode } = rule
  let found = findings.get(sourceCode)
  if (!found) {
    found = checkCode(sourceCode.text, ctx, { filename: rule.filename })
    findings.set(sourceCode, found)
  }
  return found
}

/** The message a finding is reported with: the rule's number first, as check_code cites it, then what to write instead. */
export function format(f: Pick<Finding, 'rule' | 'message' | 'fix'>) {
  return `${f.rule ? `Rule ${f.rule}` : 'check_code directive'}: ${f.message} Fix: ${f.fix}`
}

function rule(severity: Severity, description: string): Rule.RuleModule {
  return {
    meta: {
      type: severity === 'error' ? 'problem' : 'suggestion',
      docs: { description, url: `${data.manifest.storybook}?path=/docs/mola-ui-principles--overview` },
      schema: [],
      messages: { finding: '{{text}}' },
    },
    create(rule) {
      return {
        Program() {
          const lines = rule.sourceCode.lines
          for (const f of findingsFor(rule)) {
            if (f.severity !== severity) continue
            const text = lines[f.line - 1] ?? ''
            rule.report({
              loc: { start: { line: f.line, column: f.column - 1 }, end: { line: f.line, column: Math.max(f.column, text.length) } },
              messageId: 'finding',
              data: { text: format(f) },
            })
          }
        },
      }
    },
  }
}

const rules = {
  'design-rules': rule('error', "Mola UI's design rules: what breaks one in every context (a border on a control, a hex literal, a hand-rolled dialog, a guessed export)."),
  'design-advice': rule('warn', "Mola UI's design rules: what is very probably wrong but cannot be proved from the code (a hand-styled native control, a colour that names no token)."),
}

const plugin = {
  meta: { name: '@demogar/mola-ui/eslint', version: data.version },
  rules,
  configs: {} as Record<string, Linter.Config>,
} satisfies ESLint.Plugin

plugin.configs.recommended = {
  name: 'mola-ui/recommended',
  plugins: { 'mola-ui': plugin },
  rules: { 'mola-ui/design-rules': 'error', 'mola-ui/design-advice': 'warn' },
}

export default plugin
