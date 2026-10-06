/**
 * Codemod: `<Skeleton shape="line">` → `<Skeleton shape="text">`.
 *
 * `line` was renamed to `text` in 0.2.0 and is removed in 1.0.0.
 *
 *   npx tsx codemods/skeleton-line-to-text.ts <file or directory>... [--dry]
 *
 * Built on the TypeScript compiler API, which every consumer of a typed React
 * library already has, rather than jscodeshift, which would be a dependency
 * for one rename. The parser only finds positions; the edit is spliced into
 * the original text, so formatting, comments and quotes are left exactly as
 * they were — a printer would reformat the whole file and bury the one change
 * in the diff.
 *
 * It rewrites only what it can prove is ours: a JSX element whose tag is the
 * local name `Skeleton` was imported under from `@demogar/mola-ui` (aliases
 * included), with a string-literal `shape="line"`. A dynamic `shape={value}`
 * is reported, not guessed at.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'

export const PACKAGE = '@demogar/mola-ui'

export interface Result {
  output: string
  changes: number
  /** `file:line` of each `shape={…}` it could not decide. */
  manual: number[]
}

function localNames(source: ts.SourceFile) {
  const names = new Set<string>()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== PACKAGE) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const el of bindings.elements) {
      if ((el.propertyName ?? el.name).text === 'Skeleton') names.add(el.name.text)
    }
  }
  return names
}

export function transform(input: string, fileName = 'file.tsx'): Result {
  const source = ts.createSourceFile(fileName, input, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const names = localNames(source)
  const edits: { start: number; end: number; text: string }[] = []
  const manual: number[] = []
  if (names.size === 0) return { output: input, changes: 0, manual }

  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && names.has(node.tagName.getText(source))) {
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.getText(source) !== 'shape' || !attr.initializer) continue
        const init = attr.initializer
        const literal = ts.isStringLiteral(init)
          ? init
          : ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)
            ? init.expression
            : null
        if (literal) {
          if (literal.text === 'line') {
            // Keep the quote character the author used.
            const quote = literal.getText(source)[0]
            edits.push({ start: literal.getStart(source), end: literal.getEnd(), text: `${quote}text${quote}` })
          }
        } else {
          manual.push(source.getLineAndCharacterOfPosition(attr.getStart(source)).line + 1)
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
    console.error('usage: npx tsx codemods/skeleton-line-to-text.ts <file or directory>... [--dry]')
    process.exit(2)
  }
  let total = 0
  for (const file of targets.flatMap(files)) {
    const input = readFileSync(file, 'utf8')
    const { output, changes, manual } = transform(input, file)
    for (const line of manual) console.warn(`${file}:${line} shape is not a string literal; check it by hand`)
    if (changes === 0) continue
    total += changes
    console.log(`${dry ? 'would rewrite' : 'rewrote'} ${changes} in ${file}`)
    if (!dry) writeFileSync(file, output)
  }
  console.log(`${total} change${total === 1 ? '' : 's'}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2))
