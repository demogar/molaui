import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { found } from './found'

/**
 * Controlled-or-uncontrolled state goes through `useControllable`
 * (src/lib/use-controllable.ts), never a hand-rolled copy.
 *
 * Nine components each wrote `value ?? own` themselves, and the copies drifted
 * apart: one reported a change that had not happened, one kept a shadow of
 * Base UI's state, one hid a private hook. The shape every copy shares is
 * state seeded from a `default*` prop — `useState(defaultOpen)`,
 * `useState(() => defaultFiles ?? [])` — so that is what this looks for, in
 * the AST rather than with a regex, and it also fails any component that
 * declares its own `useControllable`.
 *
 * EXEMPT is for state that is seeded from a default but is genuinely owned,
 * with the reason. It should stay short.
 */
const root = resolve(import.meta.dirname, '..')

const EXEMPT: Record<string, string> = {
  // The list is an upload queue: rows move from queued to uploading to done
  // as promises settle, so the component must own them. `defaultFiles` seeds
  // the queue; changes are reported through `onFilesChange`, and there is no
  // `files` prop to control because a parent could not drive the uploads.
  'components/file-upload/file-upload.tsx': 'owns its upload queue',
  // The focused day is the grid's roving tab stop, not a value: no parent
  // listens to it, and the one outside influence (`visibleDate`) is a
  // request to move it, followed during render.
  'components/date-picker/calendar.tsx': 'owns its roving tab stop',
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
  })
}

function mentionsDefault(node: ts.Node, sf: ts.SourceFile): boolean {
  let seen = false
  const visit = (n: ts.Node) => {
    if (seen) return
    if (ts.isIdentifier(n) && /^default[A-Z]/.test(n.text)) seen = true
    else ts.forEachChild(n, visit)
  }
  visit(node)
  return seen || /\bdefault[A-Z]\w*/.test(node.getText(sf))
}

/** `file:line what` for each hand-rolled controllable pair. */
export function findHandRolled(fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const hits: string[] = []
  const at = (node: ts.Node) => `${fileName}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf)
      const arg = node.arguments[0]
      if (/(^|\.)useState$/.test(callee) && arg && mentionsDefault(arg, sf)) {
        hits.push(`${at(node)} useState seeded from ${arg.getText(sf)}`)
      }
    }
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'useControllable'
    ) {
      hits.push(`${at(node)} declares its own useControllable`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return hits
}

describe('controllable state has one implementation', () => {
  it('flags the shapes it is meant to catch', () => {
    const source = `
      const [open, setOpen] = React.useState(defaultOpen)
      const [rows] = useState(() => defaultRows ?? [])
      const [step] = React.useState(step.defaultOpen ?? false)
      function useControllable() {}
      const [count] = React.useState(0)
    `
    expect(findHandRolled('fixture.tsx', source)).toEqual([
      'fixture.tsx:2 useState seeded from defaultOpen',
      'fixture.tsx:3 useState seeded from () => defaultRows ?? []',
      'fixture.tsx:4 useState seeded from step.defaultOpen ?? false',
      'fixture.tsx:5 declares its own useControllable',
    ])
  })

  it('no component seeds state from a default* prop or defines its own useControllable', () => {
    const handRolled = found(walk(join(root, 'components')), 40, 'component sources').flatMap((file) => {
      const name = relative(root, file)
      return name in EXEMPT ? [] : findHandRolled(name, readFileSync(file, 'utf8'))
    })
    expect(handRolled).toEqual([])
  })

  it('every exemption still names a file that needs it', () => {
    for (const name of Object.keys(EXEMPT)) {
      expect(findHandRolled(name, readFileSync(join(root, name), 'utf8')), name).not.toEqual([])
    }
  })
})
