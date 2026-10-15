/**
 * VS Code snippets, generated from the stories and the manifest.
 *
 * One snippet per component page, `mola-<name>`, whose body is a story from
 * that page that a consumer could paste and compile, with its words turned
 * into tab stops. A page with no such story gets the component with its
 * required props, read from the manifest.
 *
 * Hand-written snippets were the first idea, and the reason this file exists
 * instead: a snippet file is a second copy of every component's API, and the
 * audit found that every second copy in this repository drifted until a gate
 * read it from the source. The stories are already what axe, the SSR test and
 * the visual baselines check, so a snippet taken from one is markup those
 * gates have passed. `npm run manifest` writes the file and `manifest:check`
 * fails when it is stale, exactly as for the agent docs.
 *
 * A story qualifies only if every name its JSX uses is imported by the
 * stories file and exported by the package (or is a lucide icon, since
 * lucide-react is a dependency): a story that renders a local fixture or
 * helper would paste as code that does not compile, and a local helper can
 * even share a name with an export (the Toast stories have their own
 * `Stack`). The check runs on the generated code, reparsed, so it also proves
 * the snippet is valid TSX. A `render` with a block body is skipped too: it
 * holds hooks or local state a snippet cannot carry.
 *
 * Which story: the first, in source order, whose root is the page's
 * component; then the first built from the component and its args alone;
 * then any whose root is exported. A gallery of variants in a layout `div` is
 * the last resort, because a snippet is one instance, not a comparison.
 */
import ts from 'typescript'

export interface SnippetPage {
  /** The stories title, "Components/Actions/Button". */
  title: string
  /** The stories file's text. */
  source: string
  /** The page's one-sentence summary from the usage guidance. */
  summary: string
  /** The required props of each component the page documents, from the manifest, for the fallback snippet. */
  required: Record<string, { name: string; type: string }[]>
}

export interface Snippet {
  scope: string
  prefix: string
  description: string
  body: string[]
}

export const PACKAGE = '@demogar/mola-ui'
export const SNIPPETS_FILE = 'snippets/mola-ui.code-snippets'

/** Globals a story's JSX may use that need no import. */
const GLOBALS = new Set(['undefined', 'Array', 'Math', 'Date', 'String', 'Number', 'Object', 'JSON'])

const kebab = (text: string) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node) || ts.isAsExpression(node)) node = node.expression
  return node
}

const keyOf = (name: ts.PropertyName, sf: ts.SourceFile) => name.getText(sf).replace(/^['"]|['"]$/g, '')

function objectProp(obj: ts.ObjectLiteralExpression, key: string, sf: ts.SourceFile) {
  const p = obj.properties.find((x) => x.name && keyOf(x.name, sf) === key)
  return p && ts.isPropertyAssignment(p) ? unwrap(p.initializer) : undefined
}

function argsOf(obj: ts.ObjectLiteralExpression | undefined, sf: ts.SourceFile, into = new Map<string, ts.Expression>()) {
  const args = obj && objectProp(obj, 'args', sf)
  if (args && ts.isObjectLiteralExpression(args)) {
    for (const p of args.properties) if (ts.isPropertyAssignment(p)) into.set(keyOf(p.name, sf), unwrap(p.initializer))
  }
  return into
}

/**
 * The args as JSX attributes, and their `children`. Actions (`fn()`) and
 * handlers are the consumer's to wire up, so they are left out, except a
 * required one, which becomes an empty function so the snippet compiles.
 */
function argsToJsx(args: Map<string, ts.Expression>, sf: ts.SourceFile, required: ReadonlySet<string>) {
  const attrs: string[] = []
  let children: string | undefined
  for (const [name, value] of args) {
    if ((ts.isCallExpression(value) && value.expression.getText(sf) === 'fn') || ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
      if (required.has(name)) attrs.push(`${name}={() => {}}`)
      continue
    }
    if (name === 'children') {
      children = ts.isStringLiteralLike(value)
        ? value.text
        : ts.isJsxElement(value) || ts.isJsxSelfClosingElement(value) || ts.isJsxFragment(value)
          ? value.getText(sf)
          : `{${value.getText(sf)}}`
    } else if (value.kind === ts.SyntaxKind.TrueKeyword) attrs.push(name)
    else if (ts.isStringLiteralLike(value) && !/["{}]/.test(value.text)) attrs.push(`${name}="${value.text}"`)
    else attrs.push(`${name}={${value.getText(sf)}}`)
  }
  return { attrs, children }
}

/** Remove the indentation the first line had in its file from every line after it. */
function dedent(text: string, column: number) {
  const [first, ...rest] = text.split('\n')
  return [first, ...rest.map((line) => line.slice(Math.min(column, line.length - line.trimStart().length)))].join('\n')
}

const rootTag = (code: string) => /^<([A-Za-z][\w.]*)/.exec(code)?.[1]

/** Whether the stories ever give the component children, which is how a snippet knows to leave room for them. */
function takesChildren(sf: ts.SourceFile, name: string) {
  let found = false
  const visit = (node: ts.Node) => {
    if (found) return
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === name) found = true
    else ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

/** Where the cursor ends up when the snippet's last tab stop belongs inside an element. A JSX comment, so the code still parses. */
const CURSOR = '{/*cursor*/}'

interface Candidate {
  code: string
  rank: number
}

/** Every story as JSX, ranked (lower is better), in source order within a rank. */
function candidates(sf: ts.SourceFile, exported: ReadonlySet<string>, requiredOf: (component?: string) => ReadonlySet<string>): { list: Candidate[]; component?: string } {
  const declared = (name: string) => {
    for (const st of sf.statements) {
      if (!ts.isVariableStatement(st)) continue
      for (const d of st.declarationList.declarations) {
        const init = d.initializer && unwrap(d.initializer)
        if (d.name.getText(sf) === name && init && ts.isObjectLiteralExpression(init)) return init
      }
    }
    return undefined
  }
  let meta: ts.ObjectLiteralExpression | undefined
  for (const st of sf.statements) {
    if (!ts.isExportAssignment(st)) continue
    const e = unwrap(st.expression)
    meta = ts.isObjectLiteralExpression(e) ? e : ts.isIdentifier(e) ? declared(e.text) : undefined
  }
  const componentNode = meta && objectProp(meta, 'component', sf)
  const component = componentNode && ts.isIdentifier(componentNode) ? componentNode.text : undefined
  const list: Candidate[] = []
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue
    for (const d of st.declarationList.declarations) {
      const init = d.initializer && unwrap(d.initializer)
      if (!init || !ts.isObjectLiteralExpression(init)) continue
      const { attrs, children } = argsToJsx(argsOf(init, sf, argsOf(meta, sf)), sf, requiredOf(component))
      const render = objectProp(init, 'render', sf)
      if (!render) {
        if (!component) continue
        const open = [component, ...attrs].join(' ')
        if (children !== undefined) list.push({ code: `<${open}>${children}</${component}>`, rank: 1 })
        // A layout component built from args alone renders empty; a story that fills it says more.
        else if (takesChildren(sf, component)) list.push({ code: `<${open}>${CURSOR}</${component}>`, rank: 2.5 })
        else list.push({ code: `<${open} />`, rank: 1 })
        continue
      }
      if (!ts.isArrowFunction(render) || ts.isBlock(render.body)) continue
      const body = unwrap(render.body)
      const start = body.getStart(sf)
      let code = dedent(body.getText(sf), start - sf.text.lastIndexOf('\n', start - 1) - 1)
      const param = render.parameters[0]?.name.getText(sf)
      if (param) {
        // `{...args}` becomes the args themselves, written out.
        code = code.replace(new RegExp(`\\s*\\{\\.\\.\\.${param}\\}`, 'g'), attrs.length ? ` ${attrs.join(' ')}` : '')
        if (new RegExp(`\\b${param}\\b`).test(code)) continue
      }
      const root = rootTag(code)
      if (root && root === component) list.push({ code, rank: 0 })
      else if (root && exported.has(root)) list.push({ code, rank: 2 })
      // A layout wrapper is a last resort, and only around the page's own component, not a neighbour's.
      else if (!component || new RegExp(`<${component}\\b`).test(code)) list.push({ code, rank: 3 })
    }
  }
  return { list: list.sort((a, b) => a.rank - b.rank), ...(component ? { component } : {}) }
}

/** Names the JSX uses but does not declare, or null if it does not parse. */
function freeNames(code: string) {
  const sf = ts.createSourceFile('snippet.tsx', `const _ = (\n${code}\n)`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if ((sf as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics.length) return null
  const used = new Set<string>()
  const declared = new Set<string>(['_'])
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      const p = node.parent
      if (ts.isJsxClosingElement(p) || ts.isJsxAttribute(p)) return
      if ((ts.isJsxOpeningElement(p) || ts.isJsxSelfClosingElement(p)) && p.tagName === node && /^[a-z]/.test(node.text)) return
      if ((ts.isPropertyAccessExpression(p) || ts.isPropertyAssignment(p)) && p.name === node) return
      if ((ts.isParameter(p) || ts.isBindingElement(p) || ts.isVariableDeclaration(p)) && p.name === node) {
        declared.add(node.text)
        return
      }
      used.add(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return [...used].filter((name) => !declared.has(name) && !GLOBALS.has(name))
}

/**
 * A string worth a tab stop: words a person writes (a label, a title, body
 * text), not a token value such as `tone="info"` or a class list, which the
 * reader keeps or changes on purpose rather than tabbing through.
 */
const isWords = (text: string) => /\s/.test(text.trim()) || /^[A-Z]/.test(text.trim())

/**
 * Turn the words into tab stops and escape the rest for VS Code's snippet
 * syntax (`$` and `\` everywhere, `}` inside a placeholder). Positions come
 * from parsing the code, not from a regex, so a quote inside an expression is
 * never mistaken for an attribute.
 */
function withTabStops(code: string) {
  const prefix = 'const _ = (\n'
  const sf = ts.createSourceFile('snippet.tsx', `${prefix}${code}\n)`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const stops: [number, number][] = []
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && node.text.trim() && isWords(node.text)) {
      // A JsxText node starts at `pos`, whitespace included; trim it to the words.
      const start = node.pos + (node.text.length - node.text.trimStart().length)
      stops.push([start, start + node.text.trim().length])
    } else if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sf) !== 'className' &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      isWords(node.initializer.text)
    ) {
      stops.push([node.initializer.getStart(sf) + 1, node.initializer.getEnd() - 1])
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  stops.sort((a, b) => a[0] - b[0])
  const escape = (text: string) => text.replace(/[\\$]/g, '\\$&')
  const full = sf.text
  let out = ''
  let at = prefix.length
  stops.forEach(([start, end], i) => {
    out += `${escape(full.slice(at, start))}\${${i + 1}:${escape(full.slice(start, end)).replace(/}/g, '\\}')}}`
    at = end
  })
  out += escape(full.slice(at, full.length - 2))
  return out.includes(CURSOR) ? out.replace(CURSOR, '$0') : `${out}$0`
}

/** The component with its required props as tab stops, for a page with no pasteable story. */
function fromProps(name: string, props: { name: string; type: string }[], withChildren: boolean) {
  const attrs = props.map((p, i) => (p.type === 'string' ? `${p.name}="\${${i + 1}:${p.name}}"` : `${p.name}={\${${i + 1}:${p.name}}}`))
  const open = [name, ...attrs].join(' ')
  return withChildren ? `<${open}>$0</${name}>` : `<${open} />$0`
}

/** Every component page's snippet, keyed by the page's name. */
export function snippets(pages: SnippetPage[], exported: ReadonlySet<string>): Record<string, Snippet> {
  const out: Record<string, Snippet> = {}
  const prefixes = new Map<string, string>()
  for (const page of [...pages].sort((a, b) => a.title.localeCompare(b.title))) {
    const sf = ts.createSourceFile('stories.tsx', page.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const imported = new Set<string>()
    const icons = new Set<string>()
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly) continue
      const named = st.importClause?.namedBindings
      if (!named || !ts.isNamedImports(named)) continue
      const from = (st.moduleSpecifier as ts.StringLiteral).text
      for (const el of named.elements) {
        if (el.isTypeOnly) continue
        if (from === 'lucide-react') icons.add(el.name.text)
        else if (from.startsWith('.') || from.startsWith('@/')) imported.add(el.name.text)
      }
    }
    const ours = (n: string) => imported.has(n) && exported.has(n)
    const requiredOf = (c?: string) => new Set((c && page.required[c]?.map((p) => p.name)) || [])
    const { list, component } = candidates(sf, exported, requiredOf)
    let body: string | undefined
    let names: string[] = []
    for (const { code } of list) {
      const free = freeNames(code)
      if (free && free.every((n) => ours(n) || icons.has(n))) {
        body = withTabStops(code)
        names = free
        break
      }
    }
    const name = page.title.split('/').at(-1)!
    if (body === undefined) {
      // The component the page is named for, then the stories' own, then the first the page documents.
      const named = page.title.split('/').at(-1)!.replace(/ (\w)/g, (_, c: string) => c.toUpperCase())
      const target = [named, component, ...Object.keys(page.required)].find((n) => n && n in page.required)
      if (!target) throw new Error(`${page.title}: no story can be pasted and no component to build a snippet from`)
      body = fromProps(target, page.required[target] ?? [], takesChildren(sf, target))
      names = [target]
    }
    const prefix = `mola-${kebab(name)}`
    const other = prefixes.get(prefix)
    if (other) throw new Error(`Snippet prefix ${prefix} is used by both ${other} and ${page.title}`)
    prefixes.set(prefix, page.title)
    const fromPackage = names.filter((n) => exported.has(n)).sort()
    const fromLucide = names.filter((n) => !exported.has(n)).sort()
    const imports = [`import { ${fromPackage.join(', ')} } from '${PACKAGE}'`, ...(fromLucide.length ? [`import { ${fromLucide.join(', ')} } from 'lucide-react'`] : [])]
    out[name] = {
      scope: 'typescriptreact,javascriptreact',
      prefix,
      description: `${page.summary} ${imports.join('; ')}`,
      body: body.split('\n'),
    }
  }
  return out
}

export function snippetsText(result: Record<string, Snippet>) {
  return `// Generated by scripts/export-manifest.ts from the stories and the manifest. Do not edit: run \`npm run manifest\`.
// Copy this file into your project's .vscode/ folder; type mola- in a .tsx file to see them.
${JSON.stringify(result, null, 2)}
`
}
