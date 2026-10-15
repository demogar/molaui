import type { Data } from './data'

/**
 * `check_code`: reviews UI code an agent wrote against the design rules, and
 * says which rule each finding breaks, on which line, and what to write
 * instead.
 *
 * Deterministic and dependency-free. It is a small JSX-aware scanner, not a
 * TypeScript parse: the compiler would add megabytes to the bundled bin for
 * what a scanner does here, which is to find class strings, JSX elements and
 * their attributes, imports and string literals, with comments and JSX text
 * skipped. A first version ran regexes over the raw source, and a doc comment
 * that explained "not a `border`" was reported as a border; so comments, JSX
 * text and regex literals are blanked before anything is matched.
 *
 * Only what a machine can decide is checked, and only where it can decide it.
 * A false positive teaches an agent to ignore the tool, so when the evidence
 * is partial the check stays quiet or says `warn` rather than `error`:
 *
 *   error  breaks a rule in every context: hex outside tokens.css, a border on
 *          a button, `opacity-*` on a disabled control, a hand-rolled dialog,
 *          a name the package does not export.
 *   warn   very probably wrong, but the code alone cannot prove it: a raw
 *          `<button className>` where `Button` exists, a colour utility that
 *          names no token, a radius class that Mola's theme already zeroes.
 *
 * A border is only an error on an element known to be interactive. A class
 * string in a `cva()` table or a constant has no element, so its borders are
 * not judged: a divider and a button look the same from inside a string.
 *
 * Token names and exports are read from the manifest (`contextFrom`), so the
 * checker knows exactly the names the installed version has.
 */

export type Severity = 'error' | 'warn'

export interface Finding {
  /** The rule's number in `get_rules` (src/docs/usage/rules.ts), 1-based; 0 for a malformed `check_code: allow`. */
  rule: number
  severity: Severity
  line: number
  /** The source line, trimmed. */
  excerpt: string
  message: string
  fix: string
}

export interface CheckContext {
  packageName: string
  /** Colour names with a utility: `ink` for `text-ink`, `bg-ink`, `border-ink`. */
  colors: Set<string>
  /**
   * Each colour's scopes and the Tailwind prefixes they allow, from the
   * manifest's `tokens.colors[].scopes` and `tokens.scopes[].tailwind`
   * (src/tokens/scopes.ts): `oro` allows `bg-` and `border-`, never `text-`.
   */
  scopes: Map<string, { scopes: string[]; prefixes: Set<string>; utilities: string[] }>
  /** Every export of the package, with what a check needs to know about it. */
  exports: Map<string, { page: string; phase?: string; replacedBy?: string; props: Set<string> }>
  /** Exported components whose className lands on an interactive element. */
  interactive: Set<string>
}

/**
 * The parts of a Mola export's name that mean its className reaches a
 * control: a trigger, an input, an item in a menu. `AccordionItem` ends in
 * Item but is a section, so it is named out.
 */
const INTERACTIVE_EXPORT = /(Button|Trigger|Input|Textarea|Tab|Toggle|Checkbox|Radio|Switch|Slider|Chip|Combobox|Autocomplete|Picker|Item)$/
const NOT_INTERACTIVE_EXPORT = new Set(['AccordionItem'])

export function contextFrom(data: Data): CheckContext {
  const { manifest } = data
  // A token with no utility (`--band`) has no Tailwind colour, so a class naming it is an unknown name.
  const bridged = manifest.tokens.colors.filter((c) => c.utilities.length)
  const colors = new Set(bridged.map((c) => c.token.replace(/^--/, '')))
  const scopes: CheckContext['scopes'] = new Map(
    bridged.map((c) => [
      c.token.replace(/^--/, ''),
      { scopes: c.scopes, prefixes: new Set(c.scopes.flatMap((s) => manifest.tokens.scopes[s]?.tailwind ?? [])), utilities: c.utilities },
    ]),
  )
  const exports: CheckContext['exports'] = new Map()
  const interactive = new Set<string>()
  for (const c of manifest.components) {
    for (const x of c.exports) {
      exports.set(x.name, { page: c.name, phase: c.phase, replacedBy: c.usage?.replacedBy, props: new Set(x.props?.map((p) => p.name) ?? []) })
      if (x.kind === 'component' && INTERACTIVE_EXPORT.test(x.name) && !NOT_INTERACTIVE_EXPORT.has(x.name)) interactive.add(x.name)
    }
  }
  for (const u of manifest.utilities) exports.set(u.name, { page: u.source, props: new Set() })
  return { packageName: manifest.name, colors, scopes, exports, interactive }
}

/* ── the scanner ────────────────────────────────────────────────────── */

interface Str {
  /** Index of the first character inside the quotes. */
  start: number
  value: string
}

type AttrValue = { kind: 'string'; str: Str } | { kind: 'expr'; start: number; end: number }

interface Attr {
  name: string
  value?: AttrValue
}

interface Element {
  name: string
  start: number
  attrs: Attr[]
}

interface Scan {
  strings: Str[]
  elements: Element[]
  /** The source with comments, string contents, regex bodies and JSX text replaced by spaces. */
  mask: string
}

const JSX_AFTER_WORD = new Set(['return', 'yield', 'await', 'case', 'default', 'else', 'do', 'in', 'of'])
const REGEX_AFTER_WORD = new Set([...JSX_AFTER_WORD, 'typeof', 'void', 'delete', 'instanceof', 'new', 'throw'])

function scan(src: string, mdx = false): Scan {
  const n = src.length
  const strings: Str[] = []
  const elements: Element[] = []
  const blanks: [number, number][] = []
  let i = 0

  const blank = (a: number, b: number) => b > a && blanks.push([a, b])
  const snapshot = () => [i, strings.length, elements.length, blanks.length] as const
  const restore = (s: readonly [number, number, number, number]) => {
    i = s[0]
    strings.length = s[1]
    elements.length = s[2]
    blanks.length = s[3]
  }
  const skipSpace = () => {
    while (i < n && /\s/.test(src[i]!)) i++
  }

  function readString(quote: string, escapes = true) {
    let j = i + 1
    while (j < n && src[j] !== quote && !(escapes && src[j] === '\n')) j += escapes && src[j] === '\\' ? 2 : 1
    const str = { start: i + 1, value: src.slice(i + 1, Math.min(j, n)) }
    strings.push(str)
    blank(i + 1, Math.min(j, n))
    i = Math.min(j + 1, n)
    return str
  }

  function readTemplate() {
    let j = i + 1
    let seg = j
    while (j < n) {
      if (src[j] === '\\') j += 2
      else if (src[j] === '`') break
      else if (src[j] === '$' && src[j + 1] === '{') {
        strings.push({ start: seg, value: src.slice(seg, j) })
        blank(seg, j)
        i = j + 2
        code('}')
        j = seg = i
      } else j++
    }
    strings.push({ start: seg, value: src.slice(seg, Math.min(j, n)) })
    blank(seg, Math.min(j, n))
    i = Math.min(j + 1, n)
  }

  function readRegex() {
    let j = i + 1
    let inClass = false
    for (; j < n; j++) {
      const c = src[j]
      if (c === '\\') j++
      else if (c === '\n') return false
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) break
    }
    blank(i + 1, j)
    i = j + 1
    while (i < n && /[a-z]/.test(src[i]!)) i++
    return true
  }

  /** Code until `stop` closes at depth 0 (consumed), or the end. */
  function code(stop: string | null) {
    let depth = 0
    let prev = ''
    let word = ''
    while (i < n) {
      const c = src[i]!
      if (c === '/' && src[i + 1] === '/') {
        const e = src.indexOf('\n', i)
        const end = e < 0 ? n : e
        blank(i, end)
        i = end
        continue
      }
      if (c === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2)
        const end = e < 0 ? n : e + 2
        blank(i, end)
        i = end
        continue
      }
      if (/\s/.test(c)) {
        i++
        continue
      }
      if (c === '"' || c === "'") {
        readString(c)
        prev = 'v'
        word = ''
        continue
      }
      if (c === '`') {
        readTemplate()
        prev = 'v'
        word = ''
        continue
      }
      if (c === '/' && (prev === '' || '([{,;=:?!&|+-*%<>~^'.includes(prev) || (prev === 'w' && REGEX_AFTER_WORD.has(word)))) {
        const s = snapshot()
        if (readRegex()) {
          prev = 'v'
          word = ''
          continue
        }
        restore(s)
      }
      if (c === '<' && /[A-Za-z>]/.test(src[i + 1] ?? '') && (prev === '' || '([{,;=:?!&|>'.includes(prev) || (prev === 'w' && JSX_AFTER_WORD.has(word)))) {
        const s = snapshot()
        if (element()) {
          prev = 'v'
          word = ''
          continue
        }
        restore(s)
      }
      if (/[A-Za-z_$]/.test(c)) {
        const m = /^[\w$]+/.exec(src.slice(i, i + 64))!
        word = m[0]
        prev = 'w'
        i += word.length
        continue
      }
      if (/[0-9]/.test(c)) {
        while (i < n && /[\w.]/.test(src[i]!)) i++
        prev = 'v'
        word = ''
        continue
      }
      i++
      word = ''
      prev = c
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') {
        if (depth === 0 && c === stop) return
        depth = Math.max(0, depth - 1)
      }
    }
  }

  /** A JSX element or fragment at `<`. False if it is not one (a comparison, a generic). */
  function element(): boolean {
    const start = i
    i++
    if (src[i] === '>') {
      i++
      children()
      return true
    }
    const name = /^[A-Za-z_$][\w$.:-]*/.exec(src.slice(i, i + 128))?.[0]
    // A type parameter (`<T,>(x: T) =>`, `<T extends X>`) fails below, on its comma or `extends`.
    // A lone capital alone is not enough: lucide names its close icon `X`.
    if (!name) return false
    i += name.length
    if (!/[\s/>{]/.test(src[i] ?? '')) return false
    const el: Element = { name, start, attrs: [] }
    for (;;) {
      skipSpace()
      if (i >= n) return false
      const c = src[i]!
      if (c === '/' && src[i + 1] === '>') {
        i += 2
        elements.push(el)
        return true
      }
      if (c === '>') {
        i++
        elements.push(el)
        children()
        return true
      }
      if (c === '{') {
        i++
        code('}')
        continue
      }
      const attr = /^[A-Za-z_$][\w$:.-]*/.exec(src.slice(i, i + 128))?.[0]
      if (!attr || attr === 'extends') return false
      i += attr.length
      skipSpace()
      if (src[i] !== '=') {
        el.attrs.push({ name: attr })
        continue
      }
      i++
      skipSpace()
      const v = src[i]
      if (v === '"' || v === "'") el.attrs.push({ name: attr, value: { kind: 'string', str: readString(v, false) } })
      else if (v === '{') {
        i++
        const s = i
        code('}')
        el.attrs.push({ name: attr, value: { kind: 'expr', start: s, end: i - 1 } })
      } else if (v === '<') {
        if (!element()) return false
        el.attrs.push({ name: attr })
      } else return false
    }
  }

  function children() {
    while (i < n) {
      const c = src[i]!
      if (c === '<') {
        if (src[i + 1] === '/') {
          const e = src.indexOf('>', i)
          i = e < 0 ? n : e + 1
          return
        }
        const s = snapshot()
        if (element()) continue
        restore(s)
        blank(i, i + 1)
        i++
        continue
      }
      if (c === '{') {
        i++
        code('}')
        continue
      }
      let k = i
      while (k < n && src[k] !== '<' && src[k] !== '{') k++
      blank(i, k)
      i = k
    }
  }

  if (mdx) {
    // Markdown is the children of an implicit fragment; a stray `</…>` closes nothing.
    while (i < n) children()
  } else while (i < n) code(null)

  const chars = src.split('')
  for (const [a, b] of blanks) for (let k = a; k < b; k++) if (chars[k] !== '\n') chars[k] = ' '
  return { strings, elements, mask: chars.join('') }
}

/** The index just after the bracket that closes the one at `open`, in masked text. */
function closing(mask: string, open: number) {
  let depth = 0
  for (let k = open; k < mask.length; k++) {
    const c = mask[k]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) return k + 1
    }
  }
  return mask.length
}

/* ── class tokens ───────────────────────────────────────────────────── */

interface ClassToken {
  raw: string
  variants: string[]
  /** The utility, without variants, `!` or a leading `-`. */
  utility: string
  at: number
}

function tokensOf(str: Str): ClassToken[] {
  const out: ClassToken[] = []
  for (const m of str.value.matchAll(/\S+/g)) {
    const raw = m[0]
    const parts: string[] = []
    let depth = 0
    let from = 0
    for (let k = 0; k < raw.length; k++) {
      const c = raw[k]
      if (c === '[' || c === '(') depth++
      else if (c === ']' || c === ')') depth--
      else if (c === ':' && depth === 0) {
        parts.push(raw.slice(from, k))
        from = k + 1
      }
    }
    const utility = raw.slice(from).replace(/^!|!$/g, '').replace(/^-/, '')
    out.push({ raw, variants: parts, utility, at: str.start + m.index })
  }
  return out
}

/* ── vocabulary ─────────────────────────────────────────────────────── */

const PALETTE = /^(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe)-(?:50|[1-9]00|950)|white|black)$/
const KEYWORD_COLOR = new Set(['inherit', 'current', 'transparent', 'none'])

/** What follows each colour prefix when the class is not a colour. Unknown and not here: a warning. */
const NOT_COLOR: Record<string, RegExp> = {
  text: /^(?:\d?xs|sm|base|lg|\d?xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|shadow(?:-.*)?)$/,
  bg: /^(?:fixed|local|scroll|clip-.*|origin-.*|repeat(?:-.*)?|no-repeat|auto|cover|contain|center|top|bottom|left|right|(?:left|right)-(?:top|bottom)|(?:top|bottom)-(?:left|right)|linear-.*|radial(?:-.*)?|conic(?:-.*)?|gradient-.*|blend-.*|position-.*|size-.*)$/,
  border: /^(?:\d+|px|x|y|t|b|s|e|l|r|solid|dashed|dotted|double|hidden|collapse|separate|spacing(?:-.*)?)$/,
  ring: /^(?:\d+|px|inset|offset(?:-.*)?)$/,
  'ring-offset': /^(?:\d+|px)$/,
  outline: /^(?:\d+|px|hidden|solid|dashed|dotted|double|offset-.*)$/,
  fill: /^\d+$/,
  stroke: /^\d+$/,
  decoration: /^(?:\d+|px|solid|double|dotted|dashed|wavy|auto|from-font|slice|clone)$/,
  divide: /^(?:x|y|[xy]-.*|\d+|solid|dashed|dotted|double|reverse)$/,
  from: /^\d+%?$/,
  via: /^\d+%?$/,
  to: /^\d+%?$/,
  accent: /^auto$/,
  caret: /^auto$/,
  placeholder: /^shown$/,
  shadow: /^(?:\d?xs|sm|md|lg|\d?xl|inner|cut|raised|floating|overlay)$/,
  'text-shadow': /^(?:\d?xs|sm|md|lg|\d?xl|none)$/,
  'drop-shadow': /^(?:\d?xs|sm|md|lg|\d?xl|none)$/,
  'inset-shadow': /^(?:\d?xs|sm|none)$/,
  'inset-ring': /^(?:\d+|px)$/,
}
const COLOR_UTILITY = /^(bg|text-shadow|drop-shadow|inset-shadow|inset-ring|text|border(?:-[xytbselr])?|ring-offset|ring|outline|fill|stroke|decoration|divide|from|via|to|accent|caret|placeholder|shadow)-(.+?)(?:\/(?:\d+|\[.*\]|\(.*\)))?$/

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+\d.]/
const HEX_ONLY = /^\s*#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\s*$/
/**
 * A hex inside a longer string only counts where CSS would put one: after a
 * bracket, a comma, a colon, or a length or border style (`1px solid #ccc`).
 * "Run #4182 failed" is a run number, and was the first false positive.
 */
const HEX_IN_VALUE = /(?:[(,:]\s*|(?:\d(?:px|rem|em|%)?|solid|dashed|dotted|double|inset)\s+)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?=$|[\s),;])/
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+\d.]/

/** Mola's theme sets these radius steps to 0px, so the class renders square but claims otherwise. */
const ZEROED_RADIUS = new Set(['', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'])

const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary'])
const INTERACTIVE_ROLES = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'combobox', 'textbox', 'searchbox', 'slider', 'spinbutton'])

/** Roles whose keyboard behaviour (focus trap, roving focus, typeahead) a Mola component owns. */
const COMPOSITE_ROLES: Record<string, string[]> = {
  dialog: ['Dialog', 'Drawer', 'Popover'],
  alertdialog: ['AlertDialog'],
  tablist: ['Tabs'],
  tab: ['Tabs', 'TabsTab'],
  tabpanel: ['Tabs', 'TabsPanel'],
  menu: ['Menu'],
  menubar: ['Menu', 'Toolbar'],
  menuitem: ['Menu', 'MenuItem'],
  menuitemcheckbox: ['MenuCheckboxItem'],
  menuitemradio: ['MenuRadioItem'],
  listbox: ['Select', 'Combobox'],
  option: ['SelectItem', 'Combobox'],
  combobox: ['Combobox', 'Autocomplete'],
  tooltip: ['Tooltip'],
  slider: ['Slider'],
  switch: ['Switch'],
  radiogroup: ['RadioGroup'],
  toolbar: ['Toolbar'],
  grid: ['DataTable', 'Calendar'],
  gridcell: ['DataTable', 'Calendar'],
}

/** Native elements with a Mola component, when they are styled by hand. Keyed by tag, or tag:type for inputs. */
const HAND_STYLED: Record<string, string[]> = {
  button: ['Button', 'IconButton'],
  input: ['Input'],
  'input:text': ['Input'],
  'input:email': ['Input'],
  'input:password': ['Input'],
  'input:url': ['Input'],
  'input:tel': ['Input'],
  'input:search': ['SearchInput'],
  'input:number': ['NumberInput'],
  'input:checkbox': ['Checkbox'],
  'input:radio': ['Radio', 'RadioGroup'],
  'input:range': ['Slider'],
  'input:file': ['FileUpload'],
  'input:date': ['DatePicker'],
  select: ['Select'],
  textarea: ['Textarea'],
  table: ['Table'],
  progress: ['Progress'],
  meter: ['Meter'],
  kbd: ['Kbd'],
}

/** UI libraries whose components would sit beside Mola's with another look and other behaviour. */
const OTHER_UI = /^(?:@mui\/|@material-ui\/|@chakra-ui\/|antd(?:\/|$)|@ant-design\/|@radix-ui\/|radix-ui$|@headlessui\/|react-bootstrap|reactstrap|@mantine\/|@nextui-org\/|@heroui\/|semantic-ui-react|primereact|@ark-ui\/|react-aria-components|@react-aria\/|@fluentui\/|@blueprintjs\/|flowbite-react|evergreen-ui|grommet|rsuite|@arco-design\/|vaul$|cmdk$)/
const SPINNER_PACKAGES = /^(?:react-spinners|react-loader-spinner|react-loading|spin\.js)(?:\/|$)/
const SPINNER_ICONS = /^(?:Loader|Loader2|LoaderCircle|LoaderPinwheel|Loader2Icon|LoaderIcon|LoaderCircleIcon|Spinner|CircleNotch)$/

/* ── the checks ─────────────────────────────────────────────────────── */

function near(names: Iterable<string>, query: string, count = 3) {
  const q = query.toLowerCase()
  const dist = (a: string, b: string) => {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
    for (let x = 1; x <= a.length; x++) {
      const row = [x]
      for (let y = 1; y <= b.length; y++) row[y] = Math.min(prev[y]! + 1, row[y - 1]! + 1, prev[y - 1]! + (a[x - 1] === b[y - 1] ? 0 : 1))
      prev = row
    }
    return prev[b.length]!
  }
  return [...names]
    .map((name) => ({ name, d: name.toLowerCase().includes(q) || q.includes(name.toLowerCase()) ? 0 : dist(name.toLowerCase(), q) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.name)
}

const tick = (s: string) => `\`${s}\``
const list = (names: string[]) => names.map(tick).join(' or ')

export interface CheckOptions {
  /**
   * A file name, for the language: `.css` is checked as CSS, `.mdx` as
   * Markdown with live JSX (fenced code blocks are quotations and are
   * skipped), anything else as TSX/JSX/HTML.
   */
  filename?: string
}

/**
 * An inline exception, for code that breaks a rule on purpose (a "don't"
 * example in a story):
 *
 *   // check_code: allow rule 7 — measured viewport pixels, physical in either direction
 *   {/* check_code: allow rule 12 — a static specimen of the focus band *\/}
 *
 * It covers its own line and the next one. The reason is required: an allow
 * without one, or one that names no rule, is itself an error and suppresses
 * nothing, and an allow that matches no finding is a warning, so exceptions
 * stay few, explained and current.
 */
// Not when quoted: docs that show the syntax in `code` or a string are not directives.
const DIRECTIVE = /(?<![`'"])(?:\/\/|\/\*)\s*check_code:\s*allow\b([^\n]*)/g
const DIRECTIVE_BODY = /^\s+rules?\s+(\d+(?:\s*,\s*\d+)*)\s*(?:—|–|--|-|:)\s*(.*?)\s*(?:\*\/\s*\}?\s*)?$/
/** A reason is a sentence fragment, not a token: at least three words. */
const REASON = /\S+\s+\S+\s+\S+/

export function checkCode(source: string, ctx: CheckContext, options: CheckOptions = {}): Finding[] {
  const findings = findAll(source, ctx, options)
  const lines = source.split('\n')
  const allows: { line: number; rules: number[]; used: boolean }[] = []
  const problems: Finding[] = []
  for (const m of source.matchAll(DIRECTIVE)) {
    const line = source.slice(0, m.index).split('\n').length
    const excerpt = lines[line - 1]!.trim()
    const body = DIRECTIVE_BODY.exec(m[1] ?? '')
    const rules = body ? body[1]!.split(',').map((n) => Number(n.trim())) : []
    if (!body || !REASON.test(body[2] ?? '') || rules.some((n) => n < 1 || n > 14)) {
      problems.push({
        rule: rules[0] && rules[0] <= 14 ? rules[0] : 0,
        severity: 'error',
        line,
        excerpt,
        message: 'A `check_code: allow` without a rule number and a reason is ignored: an exception has to say why.',
        fix: 'Write `// check_code: allow rule N — why this breaks the rule on purpose`, or fix the finding instead.',
      })
      continue
    }
    allows.push({ line, rules, used: false })
  }
  const kept = findings.filter((f) => {
    const allow = allows.find((a) => (f.line === a.line || f.line === a.line + 1) && a.rules.includes(f.rule))
    if (allow) allow.used = true
    return !allow
  })
  for (const a of allows.filter((x) => !x.used)) {
    problems.push({
      rule: a.rules[0]!,
      severity: 'warn',
      line: a.line,
      excerpt: lines[a.line - 1]!.trim(),
      message: `\`check_code: allow rule ${a.rules.join(', ')}\` matches no finding on this line or the next.`,
      fix: 'Remove it, or move it to the line just above the code it excuses.',
    })
  }
  return sorted([...kept, ...problems])
}

function findAll(source: string, ctx: CheckContext, options: CheckOptions = {}): Finding[] {
  const lines = source.split('\n')
  const starts: number[] = [0]
  for (let k = 0; k < source.length; k++) if (source[k] === '\n') starts.push(k + 1)
  const lineAt = (pos: number) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid]! <= pos) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
  const findings: Finding[] = []
  const seen = new Set<string>()
  const report = (pos: number, rule: number, severity: Severity, message: string, fix: string) => {
    const line = lineAt(pos)
    const key = `${rule}:${line}:${message}`
    if (seen.has(key)) return
    seen.add(key)
    const text = lines[line - 1]!.trim()
    findings.push({ rule, severity, line, excerpt: text.length > 160 ? `${text.slice(0, 157)}…` : text, message, fix })
  }
  const known = (names: string[]) => names.filter((x) => ctx.exports.has(x))

  const css = /\.(?:css|pcss|scss)$/i.test(options.filename ?? '') || (!options.filename && looksLikeCss(source))
  if (css) {
    checkCss(source, ctx, report)
    return sorted(findings)
  }

  // MDX: the prose is JSX children; fenced blocks and inline code spans quote code rather than render it.
  const mdx = /\.mdx$/i.test(options.filename ?? '')
  const blankOut = (s: string) => s.replace(/[^\n]/g, ' ')
  const scanned = mdx ? source.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blankOut).replace(/`[^`\n]+`/g, blankOut) : source
  const { strings, elements, mask } = scan(scanned, mdx)

  /* Which strings are class lists, and on which element. */
  const classOf = new Map<Str, Element | null>()
  const inRange = (a: number, b: number) => strings.filter((s) => s.start >= a && s.start < b)
  for (const el of elements) {
    for (const attr of el.attrs) {
      if (!/^(?:className|class)$|ClassName$/.test(attr.name) || !attr.value) continue
      // A part's className (`contentClassName`) lands on a part, not on this element.
      const target = attr.name === 'className' || attr.name === 'class' ? el : null
      if (attr.value.kind === 'string') classOf.set(attr.value.str, target)
      else for (const s of inRange(attr.value.start, attr.value.end)) if (!classOf.has(s)) classOf.set(s, target)
    }
  }
  const claim = (from: number, to: number) => {
    for (const s of inRange(from, to)) if (!classOf.has(s)) classOf.set(s, null)
  }
  for (const m of mask.matchAll(/(?<![\w$.])(?:cn|clsx|cx|cva|tv|twMerge|twJoin|classNames|classnames)\s*\(/g)) {
    const open = m.index + m[0].length - 1
    claim(open, closing(mask, open))
  }
  // `{ className: '…' }` in props objects and cva's compoundVariants: the string opens right after the colon.
  for (const m of mask.matchAll(/(?<![\w$])(?:className|class)\s*:\s*/g)) claim(m.index, m.index + m[0].length + 2)
  for (const m of mask.matchAll(/\b(?:const|let|var)\s+([\w$]*(?:[cC]lass(?:es|Names?)?|CLASS(?:ES)?))\s*(?::[^=\n]+)?=\s*/g)) {
    const at = m.index + m[0].length
    if (mask[at] === "'" || mask[at] === '"') claim(at, at + 2)
    else if (mask[at] === '`') claim(at, mask.indexOf('`', at + 1) + 1 || mask.length)
  }

  // Nested elements are pushed before the element whose attribute holds them, so the innermost wins.
  const attrOf = new Map<Str, string>()
  for (const el of elements) {
    for (const attr of el.attrs) {
      if (!attr.value) continue
      if (attr.value.kind === 'string') attrOf.set(attr.value.str, attr.name)
      else for (const s of inRange(attr.value.start, attr.value.end)) if (!attrOf.has(s)) attrOf.set(s, attr.name)
    }
  }

  const isIntrinsic = (el: Element) => /^[a-z]/.test(el.name)
  const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)
  const literal = (el: Element, name: string) => {
    const v = attr(el, name)?.value
    return v?.kind === 'string' ? v.str.value : undefined
  }
  const isInteractive = (el: Element) => {
    if (isIntrinsic(el)) {
      if (INTERACTIVE_TAGS.has(el.name)) return el.name !== 'input' || literal(el, 'type') !== 'hidden'
      const role = literal(el, 'role')
      if (role && INTERACTIVE_ROLES.has(role)) return true
      return Boolean(attr(el, 'onClick'))
    }
    return ctx.interactive.has(el.name)
  }
  const isDisabled = (el: Element) => {
    const d = attr(el, 'disabled') ?? attr(el, 'aria-disabled')
    if (!d) return false
    if (!d.value) return true
    if (d.value.kind === 'string') return d.value.str.value !== 'false'
    return !/^\s*false\s*$/.test(source.slice(d.value.start, d.value.end))
  }
  const tag = (el: Element | null | undefined) => (el ? `<${el.name}>` : 'this element')

  /* Every class on each element, across all its class strings. */
  const classesOf = new Map<Element, ClassToken[]>()
  for (const [str, el] of classOf) if (el) classesOf.set(el, [...(classesOf.get(el) ?? []), ...tokensOf(str)])
  /**
   * A keyline on ONE side of a control is a divider between rows (a list of
   * row buttons, the link row at the foot of a card), not the control's edge:
   * it never changes on hover and has nothing to reflow. Only that exact
   * shape is let through; a full border, a coloured one or one that changes
   * with state is an edge.
   */
  const dividerOnly = (el: Element) =>
    (classesOf.get(el) ?? [])
      .filter((t) => /^border(?:-|$)/.test(t.utility) && !/^border-(?:0|collapse|separate|spacing)/.test(t.utility) && !t.variants.includes('forced-colors'))
      .every((t) => !t.variants.length && /^border-(?:[tbse](?:-\d+)?|keyline|keyline-soft)$/.test(t.utility))

  // Rule 1: a border on an interactive edge. One finding per element, naming its border classes.
  for (const [el, tokens] of classesOf) {
    if (!isInteractive(el) || dividerOnly(el)) continue
    const edge = tokens.filter(
      (t) =>
        !t.variants.includes('forced-colors') &&
        /^border(?:-[xytbselr])?(?:-.+)?$/.test(t.utility) &&
        !/^border(?:-[xytbselr])?-(?:0|none|transparent|hidden)$|^border-(?:collapse|separate|spacing(?:-.*)?|solid|dashed|dotted|double|none|hidden)$/.test(t.utility),
    )
    if (!edge.length) continue
    report(
      edge[0]!.at,
      1,
      'error',
      `${edge.map((t) => tick(t.raw)).join(' ')} on ${tag(el)}: an interactive edge is a box-shadow keyline, never a border${edge.some((t) => t.utility.includes('keyline')) ? ' (`border-keyline` is for decorative dividers only)' : ''}.`,
      el.name === 'a'
        ? 'For a link underline, use `underline decoration-keyline underline-offset-4`; for a link styled as a control, `shadow-cut` or the Mola `Button`.'
        : isIntrinsic(el)
        ? 'Use `shadow-cut` (`shadow-floating` on a popup, `shadow-overlay` on a dialog or drawer), or better, the Mola component, which draws its own edge.'
        : `Remove it: ${el.name} draws its own \`shadow-cut\` edge.`,
    )
  }

  /* Class lists. */
  for (const [str, el] of classOf) {
    const tokens = tokensOf(str)
    const utilities = new Set(tokens.map((t) => t.raw.replace(/^!/, '')))
    for (const t of tokens) {
      const { utility: u, variants, raw } = t
      const negative = /^!?-/.test(raw.slice(variants.join(':').length + (variants.length ? 1 : 0)))

      // Rule 2: radius.
      const r = /^rounded(?:-(t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?(?:-(.+))?$/.exec(u)
      if (r) {
        const side = r[1]
        const size = r[2] ?? ''
        const full = size === 'full' || /^\[(?:50%|9999px|999px|100%)\]$/.test(size)
        if (size === 'none' || size === '0') {
          // Square, which is the rule.
        } else if (full && !side) {
          if (el && isInteractive(el) && !variants.length) {
            report(t.at, 2, 'warn', `${tick(raw)} on ${tag(el)}: \`rounded-full\` is only for something that is genuinely a dot, and a control is not.`, 'Remove it; controls are square.')
          }
        } else if (ZEROED_RADIUS.has(size)) {
          report(t.at, 2, 'warn', `${tick(raw)}: Mola's theme sets this radius to 0, so it renders square, but the class says otherwise.`, 'Remove it.')
        } else {
          report(t.at, 2, 'error', `${tick(raw)}: radius is zero in Mola; this one renders rounded.`, 'Remove it. Only a genuine dot takes `rounded-full`.')
        }
      }

      // Rule 4: opacity on a disabled control.
      if (/^opacity-/.test(u) && u !== 'opacity-100' && u !== 'opacity-0') {
        if (variants.some((v) => v.includes('disabled'))) {
          report(t.at, 4, 'error', `${tick(raw)} fades a disabled control, taking its keyline and label to about 2:1.`, 'Remove it. Pass `disabled` to the Mola control and let it draw the disabled state.')
        } else if (el && !variants.length && isDisabled(el)) {
          report(t.at, 4, 'error', `${tick(raw)} on a disabled ${tag(el)} fades its keyline and label to about 2:1.`, 'Remove it. Pass `disabled` to the Mola control and let it draw the disabled state.')
        }
      }

      // Rule 5: colour literals and names that are not tokens.
      if (/\[/.test(raw) && COLOR_LITERAL.test(raw)) {
        report(t.at, 5, 'error', `${tick(raw)} is a colour literal; only tokens.css holds colour values, each with a measured contrast pairing.`, 'Use a token utility (`bg-cloth-pale`, `text-ink-2`, `bg-danger`): get_tokens lists them.')
      } else {
        const c = negative ? null : COLOR_UTILITY.exec(u)
        if (c) {
          const prefix = c[1]!
          const name = c[2]!
          const base = prefix.startsWith('border-') ? 'border' : prefix
          const scoped = ctx.scopes.get(name)
          if (scoped && !scoped.prefixes.has(prefix)) {
            // A token used for a job it is not scoped for: `text-oro` (gold is never text on light cloth).
            const fit = [...ctx.scopes].filter(([, s]) => s.prefixes.has(prefix)).map(([n]) => n)
            report(
              t.at,
              5,
              'error',
              `${tick(raw)} uses \`--${name}\` outside its scope: it is scoped ${scoped.scopes.join(', ')}, which ${prefix}- is not, so no contrast was promised for it there.`,
              `${scoped.utilities.length ? `\`--${name}\` is ${scoped.utilities.map(tick).join(', ')}. ` : ''}${fit.length ? `For a ${prefix}- colour, use a token scoped for it: ${list(near(fit, name).map((x) => `${prefix}-${x}`))}. ` : `No token is scoped for ${prefix}-: use a Mola utility instead (get_tokens). `}get_tokens lists each token's scopes.`,
            )
          } else if (!/^[[(]/.test(name) && !ctx.colors.has(name) && !KEYWORD_COLOR.has(name) && !NOT_COLOR[base]?.test(name)) {
            if (PALETTE.test(name)) {
              report(t.at, 5, 'error', `${tick(raw)} is Tailwind's palette, not a Mola token: its contrast was never measured against Mola's grounds.`, `Use a token: ${list(near(ctx.colors, name.replace(/-\d+$/, '')).map((x) => `${prefix}-${x}`))}, or get_tokens.`)
            } else if (base !== 'text' || !/^\d/.test(name)) {
              report(t.at, 5, 'warn', `${tick(raw)} names no Mola colour token: with Mola's theme alone it produces no CSS.`, `Closest tokens: ${list(near(ctx.colors, name).map((x) => `${prefix}-${x}`))}. get_tokens lists them all.`)
            }
          }
        }
      }

      // Rule 7: physical direction.
      const phys = physical(u)
      if (phys) {
        const [logical, mirror] = phys
        const symmetric = mirror && utilities.has(raw.replace(u, mirror))
        const centred = /^(?:left|right)-1\/2$/.test(u) && [...utilities].some((x) => /(?:^|:)-?translate-x-1\/2$/.test(x))
        if (!symmetric && !centred) {
          report(t.at, 7, 'error', `${tick(raw)} is a physical direction: it is wrong as soon as the page is \`dir="rtl"\`.`, `Use ${tick(raw.replace(u, logical))}.`)
        }
      }

      // Rule 8: typefaces have roles.
      if (/^font-(?:sans|serif)$/.test(u) || (/^font-\[(?![\d\s.]+\])/.test(u) && !u.includes('var(--font-'))) {
        report(t.at, 8, 'warn', `${tick(raw)} picks a typeface outside Mola's three roles.`, 'Use `font-ui` (interface), `font-text` (prose from a person or a model) or `literal` (machine literals).')
      }

      // Rule 10: no spinners.
      if (u === 'animate-spin') {
        report(t.at, 10, 'error', `${tick(raw)} is a spinner: unknown duration is the relleno working state, never a spinner.`, 'Use the working state the components already have: `Button loading`, `Progress value={null}`, `toast.running()` or `RunStatus`, with elapsed time counting up.')
      }
    }
  }

  /* Every string: colour values outside class lists (style objects, SVG attributes, constants). */
  for (const s of strings) {
    if (classOf.has(s)) continue
    const a = attrOf.get(s)
    if (a && /^(?:href|to|id|key|target|xlinkHref|htmlFor|name|src)$/.test(a)) continue
    if (HEX_ONLY.test(s.value) || HEX_IN_VALUE.test(s.value) || COLOR_FN.test(s.value)) {
      report(s.start, 5, 'error', `${tick(s.value.trim().slice(0, 60))} is a colour value; only tokens.css holds colour values, each with a measured contrast pairing.`, 'Use a token utility (`bg-cloth-pale`, `text-ink-2`), or `var(--ink)` where a CSS value is needed: get_tokens lists them.')
    }
  }

  /* Elements. A hand-built menu has a dozen `role="menuitem"`s; one finding
   * per kind, at the first, with the count, says it once. */
  const once = new Map<string, { pos: number; count: number; severity: Severity; message: string; fix: string }>()
  const group = (k: string, pos: number, severity: Severity, message: string, fix: string) => {
    const g = once.get(k)
    if (g) g.count++
    else once.set(k, { pos, count: 1, severity, message, fix })
  }
  for (const el of elements) {
    // Rule 12: behaviour a component owns. A composite role on a layout
    // component (`<Inline role="toolbar">`) is as hand-rolled as on a div; a
    // component whose own `role` prop means something else (`Message`'s
    // author) is not an ARIA role.
    const role = ctx.exports.get(el.name)?.props.has('role') ? undefined : literal(el, 'role')
    const owner = el.name === 'dialog' ? ['Dialog', 'AlertDialog'] : role ? COMPOSITE_ROLES[role] : undefined
    if (owner && known(owner).length) {
      const what = el.name === 'dialog' ? '`<dialog>`' : `\`role="${role}"\``
      group(what, el.start, 'error', `${what} re-implements behaviour a Mola component owns (focus, keyboard, dismissal).`, `Use ${list(known(owner))} from ${ctx.packageName}.`)
    }
    if (isIntrinsic(el)) {
      if (!owner && attr(el, 'aria-modal')) {
        report(el.start, 12, 'error', '`aria-modal` on a hand-built element re-implements a dialog (focus trap, dismissal).', `Use ${list(known(['Dialog', 'AlertDialog', 'Drawer']))}.`)
      }
      // A native control styled by hand, where a component exists: a suggestion.
      const type = literal(el, 'type')
      const equivalent = el.name === 'input' ? (HAND_STYLED[`input:${type ?? 'text'}`] ?? null) : (HAND_STYLED[el.name] ?? null)
      if (equivalent && attr(el, 'className') && !owner && known(equivalent).length) {
        const what = `<${el.name}${type ? ` type="${type}"` : ''}>`
        group(what, el.start, 'warn', `A hand-styled \`${what}\`: Mola has a component for it, with its states, density and keyboard behaviour done.`, `Use ${list(known(equivalent))} from ${ctx.packageName} (get_component for its props).`)
      }
      // Rule 7 in a style object.
      const style = attr(el, 'style')?.value
      if (style?.kind === 'expr') {
        const body = mask.slice(style.start, style.end)
        for (const m of body.matchAll(/\b(?:margin|padding|border)(?:Left|Right)\w*\s*:|(?<![\w.-])(?:left|right)\s*:/g)) {
          report(style.start + m.index, 7, 'error', `\`${m[0].replace(/\s*:$/, '')}\` in a style is a physical direction, wrong under \`dir="rtl"\`.`, 'Use the logical property: `marginInlineStart`, `paddingInlineEnd`, `insetInlineStart`.')
        }
        if (/\bborderRadius\s*:/.test(body)) {
          report(style.start, 2, 'error', '`borderRadius` in a style: radius is zero in Mola.', 'Remove it.')
        }
      }
    } else {
      const x = ctx.exports.get(el.name)
      if (!x) continue
      // Rule 6: theme and density are attributes, not props.
      for (const name of ['density', 'theme']) {
        if (attr(el, name) && !x.props.has(name)) {
          report(el.start, 6, 'error', `\`${name}\` on \`${el.name}\`: no Mola component takes a ${name} prop.`, `Set \`data-${name}\` on \`<html>\` or a wrapping element; portaled menus and dialogs inherit it.`)
        }
      }
    }
  }
  for (const g of once.values()) {
    report(g.pos, 12, g.severity, g.count > 1 ? `${g.message} (${g.count} times in this file; this is the first.)` : g.message, g.fix)
  }

  /* Imports. */
  for (const m of mask.matchAll(/\bimport\s+(?:type\s+)?([^'";]*?)\bfrom\s*['"]/g)) {
    const specAt = m.index + m[0].length
    const spec = strings.find((s) => s.start === specAt)?.value ?? ''
    const clause = m[1] ?? ''
    const named = /\{([\s\S]*)\}/.exec(clause)?.[1] ?? ''
    const names = named
      .split(',')
      .map((part) => part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim())
      .filter(Boolean)
    checkImport(m.index, spec, names)
  }
  for (const m of mask.matchAll(/\b(?:import|require)\s*\(?\s*['"]/g)) {
    const spec = strings.find((s) => s.start === m.index + m[0].length)?.value ?? ''
    checkImport(m.index, spec, [])
  }

  function checkImport(at: number, spec: string, names: string[]) {
    if (spec === ctx.packageName) {
      for (const name of names) {
        const x = ctx.exports.get(name)
        if (!x) {
          report(at, 12, 'error', `\`${name}\` is not exported by ${ctx.packageName}: a guessed name.`, `Close matches: ${list(near(ctx.exports.keys(), name))}. Look it up with search or get_component.`)
        } else if (x.phase === 'deprecated') {
          report(at, 13, 'warn', `\`${name}\` is deprecated.`, x.replacedBy ? `Use ${x.replacedBy.split('/').at(-1)} instead.` : 'get_component names its replacement.')
        }
      }
    } else if (OTHER_UI.test(spec)) {
      report(at, 12, 'error', `\`${spec}\` is another UI library: its components bring another look and their own behaviour beside Mola's.`, 'Use the Mola component for the job: search or list_components finds it.')
    } else if (/^@base-ui(?:-components)?\/react(?:\/|$)/.test(spec) && names.length && names.every((x) => ctx.exports.has(x))) {
      // DirectionProvider and friends: re-exported by the package, so the import has a home there.
      report(at, 12, 'warn', `${names.map(tick).join(', ')} from \`${spec}\`: ${ctx.packageName} exports ${names.length > 1 ? 'these' : 'it'} itself.`, `Import ${names.map(tick).join(', ')} from ${ctx.packageName}.`)
    } else if (/^@base-ui(?:-components)?\/react(?:\/|$)/.test(spec)) {
      report(at, 12, 'warn', `\`${spec}\` directly: Mola's components are built on Base UI and already style and wire it.`, 'Use the Mola component, and reach for Base UI only for a behaviour Mola has no component for.')
    } else if (/^@\/components\/ui(?:\/|$)/.test(spec)) {
      report(at, 12, 'warn', `\`${spec}\` looks like a copied component kit (shadcn/ui's path).`, 'Use the Mola component for the job: search or list_components finds it.')
    } else if (SPINNER_PACKAGES.test(spec)) {
      report(at, 10, 'error', `\`${spec}\` is a spinner package: unknown duration is the relleno working state, never a spinner.`, 'Use `Button loading`, `Progress value={null}`, `toast.running()` or `RunStatus`.')
    } else if (/^(?:lucide-react|@phosphor-icons\/react|react-icons(?:\/.*)?)$/.test(spec)) {
      for (const name of names.filter((x) => SPINNER_ICONS.test(x))) {
        report(at, 10, 'warn', `\`${name}\` is a spinner icon: unknown duration is the relleno working state, never a spinner.`, 'Use `Button loading`, `Progress value={null}`, `toast.running()` or `RunStatus`.')
      }
    }
  }

  return sorted(findings)
}

/** `[logical, mirror]` for a physical utility, or null. The mirror is its other side, for symmetric pairs. */
function physical(u: string): [string, string] | null {
  let m = /^(scroll-)?([pm])([lr])-(.+)$/.exec(u)
  if (m) return [`${m[1] ?? ''}${m[2]}${m[3] === 'l' ? 's' : 'e'}-${m[4]}`, `${m[1] ?? ''}${m[2]}${m[3] === 'l' ? 'r' : 'l'}-${m[4]}`]
  m = /^(left|right)-(.+)$/.exec(u)
  if (m) return [`inset-${m[1] === 'left' ? 's' : 'e'}-${m[2]}`, `${m[1] === 'left' ? 'right' : 'left'}-${m[2]}`]
  m = /^border-([lr])(-.+)?$/.exec(u)
  if (m) return [`border-${m[1] === 'l' ? 's' : 'e'}${m[2] ?? ''}`, `border-${m[1] === 'l' ? 'r' : 'l'}${m[2] ?? ''}`]
  m = /^(text|float|clear)-(left|right)$/.exec(u)
  if (m) return [`${m[1]}-${m[2] === 'left' ? 'start' : 'end'}`, '']
  return null
}

function sorted(findings: Finding[]) {
  return findings.sort((a, b) => a.line - b.line || a.rule - b.rule)
}

function looksLikeCss(source: string) {
  // Starts with a selector or an at-rule, then `{`, with nothing on the way that only script has.
  const head = source.replace(/\/\*[\s\S]*?\*\//g, '').trimStart()
  return !/\b(?:import|export|return|const|function)\b|=>|<[A-Za-z]/.test(source) && /^(?:@[a-z-]+[^{};'"`=]*|[.#:*[a-zA-Z][^{};'"`=]*)\{/.test(head)
}

/* ── CSS ────────────────────────────────────────────────────────────── */

function checkCss(source: string, ctx: CheckContext, report: (pos: number, rule: number, severity: Severity, message: string, fix: string) => void) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  for (const block of text.matchAll(/([^{};]*)\{([^{}]*)\}/g)) {
    const selector = block[1]!.trim()
    const bodyAt = block.index + block[1]!.length + 1
    const body = block[2]!
    const interactive = /(?:^|[\s,>+~(])(?:button|a|input|select|textarea|summary)(?![\w-])|\[role=["']?(?:button|link|tab|menuitem|option|checkbox|radio|switch)/.test(selector)
    const disabled = /disabled/.test(selector)
    const centred = /translate(?:X)?\(\s*-50%/.test(body)
    // `@apply` lines are class lists, checked as such below, not declarations.
    const decls = body.replace(/@apply[^;]*/g, (c) => ' '.repeat(c.length))
    for (const d of decls.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) {
      const at = bodyAt + d.index
      const prop = d[1]!.toLowerCase()
      const value = d[2]!.trim()
      if (prop === '@apply') continue
      if (COLOR_LITERAL.test(value)) {
        report(at, 5, 'error', `\`${prop}: ${value}\` is a colour literal; only tokens.css holds colour values.`, 'Use a token: `var(--ink)`, `var(--cloth-pale)`. get_tokens lists them.')
      }
      if (/^border(?:-(?:top|bottom|left|right|inline|block)(?:-(?:start|end))?)?(?:-width)?$/.test(prop) && interactive && !/^(?:none|0(?:px)?)\b/.test(value)) {
        report(at, 1, 'error', `\`${prop}\` on \`${selector}\`: an interactive edge is a box-shadow keyline, never a border.`, 'Use `box-shadow: var(--cut)` (the `shadow-cut` utility), or the Mola component.')
      }
      if (/radius$/.test(prop) && !/^(?:0(?:px)?|none)$/.test(value) && !/^(?:50%|100%|9999px|999px)$/.test(value)) {
        report(at, 2, 'error', `\`${prop}: ${value}\`: radius is zero in Mola.`, 'Remove it. Only a genuine dot is round.')
      }
      if (/^(?:(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right))/.test(prop) || ((prop === 'left' || prop === 'right') && !centred) || ((prop === 'text-align' || prop === 'float') && /^(?:left|right)$/.test(value))) {
        report(at, 7, 'error', `\`${prop}: ${value}\` is a physical direction, wrong under \`dir="rtl"\`.`, 'Use the logical property: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`.')
      }
      if (prop === 'opacity' && disabled && Number.parseFloat(value) < 1 && Number.parseFloat(value) > 0) {
        report(at, 4, 'error', `\`opacity: ${value}\` on \`${selector}\` fades a disabled control to about 2:1.`, 'Remove it; state disabled with the component, not by fading.')
      }
      if (/^animation(?:-name)?$/.test(prop) && /\bspin\b/.test(value)) {
        report(at, 10, 'error', `\`${prop}: ${value}\` is a spinner.`, 'Use the relleno working state the components have.')
      }
    }
    for (const a of body.matchAll(/@apply\s+([^;]+)/g)) {
      const at = bodyAt + a.index + a[0].length - a[1]!.length
      const sub = findAll(`<x className="${a[1]}" />`, ctx)
      for (const f of sub) report(at, f.rule, f.severity, f.message, f.fix)
    }
  }
}
