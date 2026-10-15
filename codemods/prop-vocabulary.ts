/**
 * Codemod: one meaning each for `tone`, `variant`, `kind` and `size`.
 *
 * 0.7.0 gave each of those prop names one meaning (docs/adr/0010-prop-vocabulary.md):
 * `tone` is a status, `variant` a presentation, `kind` a category and `size`
 * the t-shirt scale. The props and values that meant something else were
 * renamed, and the old spellings are removed in 1.0.0. This rewrites them:
 *
 *   <Panel tone="ink">                → <Panel layer="ink">
 *   <Placeholder tone="deep">         → <Placeholder layer="deep">
 *   <StepList tone="inverse">         → <StepList inverse>
 *   <Text tone={2}> / tone="muted"    → <Text variant="secondary"> / variant="muted"
 *   <Text size="base">, <Prose …>     → size="md"
 *   <Heading size={3}>                → <Heading visualLevel={3}>
 *   <Container size="wide">           → <Container width="wide">
 *   <Chip size="comfortable">         → <Chip size="md">   (default → sm)
 *   <Timeline size="editorial">       → <Timeline variant="editorial">
 *   <EmptyState variant="error">      → <EmptyState kind="error">  (and TableEmpty)
 *   <StreamingText tone="muted">      → <StreamingText variant="muted">
 *   <Progress tone="ink">             → <Progress tone="neutral">
 *   <MenuItem tone="default">         → <MenuItem tone="neutral">
 *   <NavItem countTone="attention">   → <NavItem countTone="danger">
 *
 *   npx tsx codemods/prop-vocabulary.ts <file or directory>... [--dry]
 *
 * Built like skeleton-line-to-text.ts, and for the same reasons: the
 * TypeScript compiler API finds positions, edits are spliced into the
 * original text so formatting and comments stay, and only JSX elements whose
 * tag was imported from `@demogar/mola-ui` (aliases included) are touched.
 *
 * A prop that is only renamed is renamed whatever its value, because the
 * values carry over: `<Container size={width}>` becomes
 * `<Container width={width}>`. A prop whose values change is rewritten only
 * for a literal it knows; anything else (`<Text tone={t}>`) is reported with
 * its file and line, not guessed at. Object props — DataTable's
 * `empty={{ variant }}`, ToolbarOverflow's `items[].tone` — are not
 * rewritten; they warn in development until they are changed by hand.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'

export const PACKAGE = '@demogar/mola-ui'

/**
 * What this codemod migrates, for the codemod index (Mola UI / Codemods).
 * `codemods/index.test.ts` holds the index row, the `deprecate()` calls and
 * this record to the same versions. ToolbarOverflow's `items[].tone` is not
 * here: it is an object prop, so it is listed on the page as a deprecation
 * without a codemod.
 */
export const meta = {
  change: 'One meaning each for `tone`, `variant`, `kind` and `size` (ADR 0010): `<Panel tone>` → `layer`, `<EmptyState variant>` → `kind`, `<Chip size="comfortable">` → `size="md"`, `<Heading size>` → `visualLevel` and the rest listed in the file',
  deprecations: [
    'panel-tone',
    'placeholder-tone',
    'step-list-tone',
    'text-tone-${tone}',
    'text-size-base',
    'prose-size-base',
    'heading-size',
    'container-size',
    'chip-size-${size}',
    'timeline-size',
    'empty-state-variant',
    'table-empty-variant',
    'streaming-text-tone',
    'progress-tone-ink',
    'menu-item-tone-default',
    'nav-item-count-tone-attention',
  ],
  deprecated: '0.7.0',
  removed: '1.0.0',
}

/** A new literal under the same (or renamed) prop, another prop altogether, or `null` to drop it. */
type Replacement = string | { prop: string; value: string | true } | null

interface Rule {
  components: string[]
  prop: string
  /** The new name for the prop, whatever its value. */
  rename?: string
  /** Literal values that change. Values not listed are left as they are. */
  values?: Record<string, Replacement>
}

export const RULES: Rule[] = [
  { components: ['Panel'], prop: 'tone', rename: 'layer' },
  { components: ['Placeholder'], prop: 'tone', rename: 'layer', values: { default: 'shade', deep: 'deep' } },
  { components: ['StepList'], prop: 'tone', values: { inverse: { prop: 'inverse', value: true }, default: null } },
  {
    components: ['Text'],
    prop: 'tone',
    values: { default: null, 2: { prop: 'variant', value: 'secondary' }, muted: { prop: 'variant', value: 'muted' } },
  },
  { components: ['Text', 'Prose'], prop: 'size', values: { base: 'md' } },
  { components: ['Heading'], prop: 'size', rename: 'visualLevel' },
  { components: ['Container'], prop: 'size', rename: 'width' },
  { components: ['Chip'], prop: 'size', values: { default: 'sm', comfortable: 'md' } },
  { components: ['Timeline'], prop: 'size', rename: 'variant' },
  { components: ['EmptyState', 'TableEmpty'], prop: 'variant', rename: 'kind' },
  { components: ['StreamingText'], prop: 'tone', rename: 'variant' },
  { components: ['Progress'], prop: 'tone', values: { ink: 'neutral' } },
  { components: ['MenuItem'], prop: 'tone', values: { default: 'neutral' } },
  { components: ['NavItem'], prop: 'countTone', values: { attention: 'danger' } },
]

export interface Result {
  output: string
  changes: number
  /** `line prop` of each value it could not decide. */
  manual: string[]
}

/** Local name → the package's export name, for every named import from the package. */
function localNames(source: ts.SourceFile, isOurs: (specifier: string) => boolean) {
  const names = new Map<string, string>()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier) || !isOurs(statement.moduleSpecifier.text)) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const el of bindings.elements) names.set(el.name.text, (el.propertyName ?? el.name).text)
  }
  return names
}

/** The literal an attribute holds, if it holds one: `"x"`, `{'x'}`, `{2}`. */
function literalOf(init: ts.JsxAttributeValue | undefined): { text: string; quote: string } | null {
  if (!init) return null
  if (ts.isStringLiteral(init)) return { text: init.text, quote: init.getText()[0]! }
  if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { text: e.text, quote: '"' }
    if (ts.isNumericLiteral(e)) return { text: e.text, quote: '"' }
  }
  return null
}

/**
 * `isOurs` decides which imports count as the package. It defaults to the
 * package name; this repository's own stories import by relative path, and
 * were migrated by passing a wider test.
 */
export function transform(
  input: string,
  fileName = 'file.tsx',
  isOurs: (specifier: string) => boolean = (specifier) => specifier === PACKAGE,
): Result {
  const source = ts.createSourceFile(fileName, input, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const names = localNames(source, isOurs)
  const edits: { start: number; end: number; text: string }[] = []
  const manual: string[] = []
  if (names.size === 0) return { output: input, changes: 0, manual }

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const exported = names.get(node.tagName.getText(source))
      if (exported) {
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue
          const prop = attr.name.getText(source)
          const rule = RULES.find((r) => r.prop === prop && r.components.includes(exported))
          if (!rule) continue
          const literal = literalOf(attr.initializer)
          const replacement = literal && rule.values ? rule.values[literal.text] : undefined

          if (replacement === null) {
            // Drop the attribute and the whitespace before it.
            let start = attr.getStart(source)
            while (start > 0 && /\s/.test(input[start - 1]!)) start -= 1
            edits.push({ start, end: attr.getEnd(), text: '' })
          } else if (typeof replacement === 'object' && replacement !== undefined) {
            const text = replacement.value === true ? replacement.prop : `${replacement.prop}="${replacement.value}"`
            edits.push({ start: attr.getStart(source), end: attr.getEnd(), text })
          } else if (typeof replacement === 'string') {
            const name = rule.rename ?? prop
            edits.push({ start: attr.getStart(source), end: attr.getEnd(), text: `${name}=${literal!.quote}${replacement}${literal!.quote}` })
          } else if (rule.rename && (!rule.values || literal)) {
            // A pure rename keeps any value; a mapped one keeps a literal it does not list.
            edits.push({ start: attr.name.getStart(source), end: attr.name.getEnd(), text: rule.rename })
          } else if (rule.rename || !literal) {
            if (attr.initializer) {
              const line = source.getLineAndCharacterOfPosition(attr.getStart(source)).line + 1
              manual.push(`${line} ${exported} ${prop}`)
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  let output = input
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  return { output, changes: edits.length, manual }
}

function files(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .filter((name) => name !== 'node_modules' && !name.startsWith('.'))
      .flatMap((name) => files(join(path, name)))
  }
  return /\.[jt]sx$/.test(path) ? [path] : []
}

function main(argv: string[]) {
  const dry = argv.includes('--dry')
  const targets = argv.filter((arg) => !arg.startsWith('--'))
  if (targets.length === 0) {
    console.error('usage: npx tsx codemods/prop-vocabulary.ts <file or directory>... [--dry]')
    process.exit(2)
  }
  let total = 0
  for (const file of targets.flatMap(files)) {
    const input = readFileSync(file, 'utf8')
    const { output, changes, manual } = transform(input, file)
    for (const entry of manual) {
      const [line, component, prop] = entry.split(' ')
      console.warn(`${file}:${line} ${component} ${prop} is not a literal this codemod knows; check it by hand`)
    }
    if (changes === 0) continue
    total += changes
    console.log(`${dry ? 'would rewrite' : 'rewrote'} ${changes} in ${file}`)
    if (!dry) writeFileSync(file, output)
  }
  console.log(`${total} change${total === 1 ? '' : 's'}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2))
