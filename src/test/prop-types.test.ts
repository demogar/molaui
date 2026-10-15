// @vitest-environment node
import { resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * The type half of prop-bags.test.tsx: every exported component's props
 * type declares `ref`, `id` and `className`.
 *
 * The runtime test proves a ref and a `data-*` reach the DOM, but JSX does
 * not check a spread's excess properties, so a component whose props type
 * had no `ref` passed it while a consumer writing `<Select ref={…}>` got a
 * type error. This reads the props type of each export of src/index.ts
 * through the checker, the way a consumer's editor does.
 *
 * NO_ELEMENT is the same list as prop-bags.test.tsx's EXEMPT: components
 * that render no element of their own, so there is nothing for a ref to
 * reach.
 */
const NO_ELEMENT = new Set([
  'DirectionProvider',
  'ToastProvider',
  'HotkeysProvider',
  'TooltipProvider',
  'Dialog',
  'Drawer',
  'Popover',
  'Menu',
  'MenuSubmenu',
  'SelectRoot',
  'Field',
  'TableSkeletonRows',
])

/** A prop a component does not take on purpose, with the reason. */
const WITHHELD: Record<string, string[]> = {
  // Base UI omits it: the listbox points `aria-activedescendant` at ids it
  // generates for its items, and a consumer's id would break that link.
  SelectItem: ['id'],
}

const root = resolve(import.meta.dirname, '../..')

function missingProps(): string[] {
  const program = ts.createProgram([resolve(root, 'src/index.ts')], {
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    noEmit: true,
  })
  const checker = program.getTypeChecker()
  const index = program.getSourceFile(resolve(root, 'src/index.ts'))!
  const found: string[] = []
  for (const exported of checker.getExportsOfModule(checker.getSymbolAtLocation(index)!)) {
    if (!/^[A-Z]/.test(exported.name) || NO_ELEMENT.has(exported.name)) continue
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    const declaration = symbol.valueDeclaration
    if (!declaration || !(ts.isFunctionDeclaration(declaration) || ts.isVariableDeclaration(declaration))) continue
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration)
    // A context (`SidebarContext`) is callable in React 19 but is not a component.
    if (type.getProperty('Provider')) continue
    const signature = type.getCallSignatures()[0]
    const param = signature?.parameters[0]
    if (!param) continue
    const props = checker.getTypeOfSymbolAtLocation(param, declaration)
    const absent = ['ref', 'id', 'className'].filter(
      (name) => !props.getProperty(name) && !WITHHELD[exported.name]?.includes(name),
    )
    if (absent.length) found.push(`${exported.name}: no ${absent.join(', ')}`)
  }
  return found.sort()
}

describe('every exported component types the props it forwards', () => {
  it('declares ref, id and className', { timeout: 60_000 }, () => {
    expect(missingProps()).toEqual([])
  })
})
