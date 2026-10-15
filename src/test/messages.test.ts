import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { defaultMessages } from '../lib/default-messages'
import { found, foundModules } from './found'

/**
 * No component says an English word that a translator cannot reach
 * (docs/adr/0014-messages.md).
 *
 * Every word a component renders on its own — a button's name, a live
 * announcement, a sentence in an error — comes from the `messages.ts` table
 * beside it, through `useMessages`, so `MessagesProvider` and the
 * component's `messages` prop can replace it. Before this test the strings
 * were literals in the JSX: "Close", "Previous page", "Thought for 4s", 300
 * of them across 50 files, and the audit found no way to change any of them
 * but forking the component.
 *
 * What counts as a word, read from the TypeScript syntax tree rather than a
 * regular expression, so comments and doc comments never count:
 *
 *   - JSX text with a letter in it: `<span>Dismiss</span>`
 *   - a string in a visible attribute: `aria-label`, `title`, `placeholder`,
 *     `alt`, `label` and the other names in VISIBLE
 *   - any string that starts like an English word, a capital and then a
 *     small letter: `'Close'`, `'Rate limited'` — a class list, a data value
 *     or an id starts lowercase, so this catches a label stored in a
 *     constant before it reaches the JSX
 *   - a template with two words in its fixed text: `` `${n} tools in parallel` ``
 *
 * Not counted: a `messages.ts` table (that is where the words belong), the
 * argument of `deprecate()`, `console.*` and `new Error()` (developer
 * text, never rendered), `.fixture.ts` demo data, and the names in ALLOWED,
 * each with the reason it is not a word for a reader.
 */
const root = resolve(import.meta.dirname, '..')

const VISIBLE = new Set([
  'aria-label',
  'aria-description',
  'aria-valuetext',
  'aria-roledescription',
  'aria-placeholder',
  'title',
  'placeholder',
  'alt',
  'label',
])

/**
 * `KeyboardEvent.key` values. They are compared with what the keyboard sends,
 * never shown, so they stay. A key name a reader sees (a `Kbd` hint) is JSX
 * text, which this list does not excuse.
 */
const KEY_NAMES = new Set([
  'Enter',
  'Escape',
  'Tab',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Backspace',
  'Delete',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'Space',
])

/** `file: text` → why it is not a word for a reader. */
const ALLOWED: Record<string, string> = {
  'components/file-upload/file-upload.tsx: Files':
    'The drag data type the browser sets for files (`dataTransfer.types`), compared, never shown.',
  'components/shortcuts/hotkeys.ts: `Key${chord.key.toUpperCase()}`': 'A `KeyboardEvent.code` value (KeyA), compared, never shown.',
  'components/shortcuts/hotkeys.ts: `Digit${chord.key}`': 'A `KeyboardEvent.code` value (Digit1), compared, never shown.',
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    if (!/\.tsx?$/.test(name) || /\.(test|stories)\.tsx?$/.test(name)) return []
    if (name === 'messages.ts' || name === 'index.ts' || name.endsWith('.fixture.ts')) return []
    return [path]
  })
}

const files = found(walk(join(root, 'components')), 60, 'component source files')

/**
 * A literal that reaches the page as it is: a JSX child or a visible
 * attribute, directly or through `? :`, `&&`, `||`, `??` or parentheses —
 * `{n === 1 ? 'result' : 'results'}` is two words even though neither starts
 * with a capital. A literal passed to a call first (`cn('…')`) is not.
 */
function rendered(node: ts.Node): boolean {
  let child = node
  let parent = node.parent
  while (
    ts.isConditionalExpression(parent) ||
    ts.isParenthesizedExpression(parent) ||
    (ts.isBinaryExpression(parent) &&
      [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
        parent.operatorToken.kind,
      ))
  ) {
    if (ts.isConditionalExpression(parent) && parent.condition === child) return false
    child = parent
    parent = parent.parent
  }
  const attribute = ts.isJsxExpression(parent) ? parent.parent : parent
  if (ts.isJsxAttribute(attribute)) return VISIBLE.has(attribute.name.getText())
  return ts.isJsxExpression(parent) && (ts.isJsxElement(parent.parent) || ts.isJsxFragment(parent.parent))
}

function literalsIn(file: string): { line: number; text: string }[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const hits: { line: number; text: string }[] = []
  const add = (node: ts.Node, text: string) =>
    hits.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text })

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return
    if (ts.isCallExpression(node) && /^(deprecate|console\.\w+)$/.test(node.expression.getText(source))) return
    if (ts.isNewExpression(node) && /Error$/.test(node.expression.getText(source))) return
    // Key names for assistive tech to announce in its own language.
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'aria-keyshortcuts') return

    if (ts.isJsxText(node)) {
      if (/\p{L}/u.test(node.text)) add(node, node.text.trim())
      return
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const visible = rendered(node)
      if (visible ? /\p{L}/u.test(node.text) : /^\p{Lu}\p{Ll}/u.test(node.text) && !KEY_NAMES.has(node.text)) add(node, node.text)
      return
    }
    if (ts.isTemplateExpression(node)) {
      const fixed = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join('')
      // Two words, or a word after a space that ends like a word:
      // `${label} transcript`. An id, a length or a class list does not
      // (`${uid}-option-${i}`, `${n}px`, `${merged} leading-tight`).
      if (/\p{L}{2,} \p{L}|\s\p{L}{3,}(?=$|[\s.,:;!?…])/u.test(fixed) || /^\p{Lu}\p{Ll}/u.test(node.head.text)) {
        add(node, node.getText(source))
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return hits
}

describe('built-in strings', () => {
  it('no component renders an English literal outside its messages table', () => {
    const offenders = files.flatMap((file) => {
      const rel = relative(root, file)
      return literalsIn(file)
        .filter(({ text }) => !(`${rel}: ${text}` in ALLOWED))
        .map(({ line, text }) => `${rel}:${line}  ${JSON.stringify(text)}`)
    })
    expect(offenders, 'Move each into the messages.ts beside the component and read it with useMessages().').toEqual([])
  })

  it('every messages table is in defaultMessages, so a translator sees it', () => {
    const tables = foundModules(
      import.meta.glob<Record<string, unknown>>('../components/**/messages.ts', { eager: true }),
      1,
      'messages tables',
    )
    const gathered = new Set(Object.values(defaultMessages))
    const missing = Object.entries(tables).flatMap(([path, exports]) =>
      Object.entries(exports)
        .filter(([, value]) => typeof value === 'object' && value !== null && !gathered.has(value as never))
        .map(([name]) => `${path}: ${name}`),
    )
    expect(missing).toEqual([])
  })

  it('the table is plain data, so a server component can pass a translation of it', () => {
    expect(JSON.parse(JSON.stringify(defaultMessages))).toEqual(defaultMessages)
  })
})
