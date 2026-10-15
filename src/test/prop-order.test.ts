import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { found } from './found'

/**
 * An internal `ref`, event handler or `aria-describedby` is never written
 * before a spread of the consumer's props.
 *
 * In JSX the last attribute wins. `<input ref={ref} {...props} />` looks like
 * it keeps the component's ref, but a consumer who passes their own `ref`
 * replaces it silently: SearchInput's clear button stopped working, and
 * TableCheckbox stopped showing `indeterminate`, because the internal ref
 * they read was never attached. The same shape on `aria-describedby` let
 * Field's wiring erase a Checkbox's own description instead of adding to it.
 * Moving the internal attribute after the spread is not the fix either — it
 * would then erase the consumer's. These three are the props where both
 * sides have something to say, so they are merged (`mergeProps`,
 * `mergeRefs`, `joinIds` in src/lib/merge-props.ts) and then spread.
 *
 * This walks the TypeScript AST rather than grepping, because a JSX element
 * spans lines and a regex cannot tell an attribute from the same text in a
 * string or a comment. A spread counts whatever its name — `{...props}`,
 * `{...rest}`, `{...control}` — because the bug does not care what it is
 * called. Stories and tests are skipped: they are consumers, not the library.
 */
const root = resolve(import.meta.dirname, '..')

const GUARDED = /^(?:ref|on[A-Z]\w*|aria-describedby)$/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    return /\.tsx$/.test(name) && !/\.(test|stories)\.tsx$/.test(name) ? [path] : []
  })
}

/** `file:line <Tag> attr` for every guarded attribute written before a spread. */
export function findShadowedAttributes(fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found: string[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const pending: ts.JsxAttribute[] = []
      for (const attr of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(attr)) {
          for (const shadowed of pending) {
            const { line } = sf.getLineAndCharacterOfPosition(shadowed.getStart(sf))
            found.push(`${fileName}:${line + 1} <${node.tagName.getText(sf)}> ${shadowed.name.getText(sf)}`)
          }
          pending.length = 0
        } else if (GUARDED.test(attr.name.getText(sf))) {
          pending.push(attr)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return found
}

describe('consumer props never silently replace internal ones', () => {
  it('flags the shape it is meant to catch', () => {
    const source = `
      const a = <input ref={ref} type="checkbox" {...props} />
      const b = <Root aria-describedby={id} onClick={go} {...rest}>x</Root>
      const c = <input {...props} ref={merged} onClick={go} />
    `
    expect(findShadowedAttributes('fixture.tsx', source)).toEqual([
      'fixture.tsx:2 <input> ref',
      'fixture.tsx:3 <Root> aria-describedby',
      'fixture.tsx:3 <Root> onClick',
    ])
  })

  it('no ref, handler or aria-describedby in src/components is written before a spread', () => {
    const shadowed = found(walk(join(root, 'components')), 40, 'component sources').flatMap((file) =>
      findShadowedAttributes(relative(root, file), readFileSync(file, 'utf8')),
    )
    expect(shadowed).toEqual([])
  })
})
