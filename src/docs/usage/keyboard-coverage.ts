import type { KeyRow } from './accessibility-types'

/**
 * Which documented keys a component's unit tests really press.
 *
 * The keyboard table on a component page (accessibility.ts) is a promise, and
 * the evidence table under it used to say "keyboard tested: yes" when the test
 * file contained a single `.tab()`. Select had no keyboard test at all, Menu
 * none for Escape, and the page still read as tested. Now every key a table
 * names must be pressed somewhere in that component's tests:
 * keyboard-coverage.test.ts fails a page that has an unpressed key, and
 * scripts/export-evidence.ts derives "keyboard tested" from the same answer.
 *
 * It reads the test source rather than recording key events at run time. A
 * recorder in the test setup would see what was dispatched, but its result
 * would exist only after a full test run, and the evidence file is generated
 * (and checked in CI) without one. Reading the source means a key counts only
 * when it is written as a literal in a call that presses it:
 *
 *   user.keyboard('{Shift>}{Tab}{/Shift}')   user-event's key syntax
 *   user.type(input, 'hello{Enter}')
 *   user.tab()  user.tab({ shift: true })
 *   fireEvent.keyDown(el, { key: 'k', metaKey: true })
 *
 * A key built from a variable does not count; write it out.
 */

/** Modifier names as the tables write them, in the order a chord prints them. */
const MODIFIERS = ['Control', 'Meta', 'Alt', 'Shift'] as const

/** "Shift+tab" and "shift+Tab" are the same chord; so are " " and "Space". */
export function normalizeChord(chord: string): string {
  const parts = chord.split('+').map((part) => normalizeKey(part))
  const key = parts.pop() ?? ''
  const mods = MODIFIERS.filter((mod) => parts.includes(mod))
  return [...mods, key].join('+')
}

function normalizeKey(key: string): string {
  if (key === ' ' || key === 'Space' || key === 'Spacebar') return 'Space'
  if (key === 'Ctrl') return 'Control'
  if (key === 'Esc') return 'Escape'
  if (key.length === 1) return key.toUpperCase()
  return key
}

/**
 * Parse user-event's keyboard syntax: `{Name}` presses a key, `{Name>}` holds
 * it, `{/Name}` releases it, `[Code]` presses by code, `{{` and `[[` are
 * literal brackets, and any other character is that key.
 */
export function chordsInKeyboardText(text: string): string[] {
  const held: string[] = []
  const pressed: string[] = []
  const press = (key: string) => {
    const name = normalizeKey(key)
    if ((MODIFIERS as readonly string[]).includes(name)) return
    pressed.push(normalizeChord([...held, name].join('+')))
  }
  let i = 0
  while (i < text.length) {
    const ch = text[i] as string
    if ((ch === '{' || ch === '[') && text[i + 1] === ch) {
      press(ch)
      i += 2
      continue
    }
    if (ch === '{' || ch === '[') {
      const close = text.indexOf(ch === '{' ? '}' : ']', i)
      if (close < 0) break
      let body = text.slice(i + 1, close)
      i = close + 1
      if (body.startsWith('/')) {
        const name = normalizeKey(body.slice(1))
        const at = held.lastIndexOf(name)
        if (at >= 0) held.splice(at, 1)
        continue
      }
      const hold = body.endsWith('>')
      if (hold) body = body.slice(0, -1)
      const name = normalizeKey(body.replace(/^Key(?=[A-Z]$)/, '').replace(/^Digit(?=\d$)/, ''))
      press(name)
      if (hold) held.push(name)
      continue
    }
    press(ch)
    i += 1
  }
  return pressed
}

/** Every chord a test source presses, normalized. */
export function pressedKeys(source: string): Set<string> {
  const keys = new Set<string>()
  for (const { name, args } of calls(source, /\.(keyboard|type|tab)\(|fireEvent\.key(?:Down|Up|Press)\(/g)) {
    if (name === '.keyboard(' || name === '.type(') {
      // keyboard(text) and type(target, text), when the text is a string literal.
      // In type(), only keys written as {Name} or [Code] count: the spaces in
      // `type(input, '  hello  ')` are text being entered, not a test of what
      // Space does to a control.
      const text = args[name === '.keyboard(' ? 0 : 1]
      const literal = text === undefined ? undefined : stringLiteral(text)
      const typed = name === '.type(' && literal !== undefined ? (literal.match(/\{[^{}]+\}|\[[^[\]]+\]/g) ?? []).join('') : literal
      if (typed !== undefined) for (const chord of chordsInKeyboardText(typed)) keys.add(chord)
    } else if (name === '.tab(') {
      keys.add(/shift:\s*true/.test(args[0] ?? '') ? 'Shift+Tab' : 'Tab')
    } else {
      // fireEvent.keyDown(el, { key: 'Enter', shiftKey: true })
      const init = args[1] ?? ''
      const key = /\bkey:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(init)?.[2]
      if (key === undefined) continue
      const mods = [
        /ctrlKey:\s*true/.test(init) && 'Control',
        /metaKey:\s*true/.test(init) && 'Meta',
        /altKey:\s*true/.test(init) && 'Alt',
        /shiftKey:\s*true/.test(init) && 'Shift',
      ].filter(Boolean)
      keys.add(normalizeChord([...mods, unescape(key)].join('+')))
    }
  }
  return keys
}

/** The value of an argument that is a single string literal, else undefined. */
function stringLiteral(arg: string): string | undefined {
  const match = /^(['"`])((?:\\.|(?!\1).)*)\1$/s.exec(arg.trim())
  if (!match || (match[1] === '`' && match[2]?.includes('${'))) return undefined
  return unescape(match[2] ?? '')
}

/**
 * Each call matched by `opener` (which must end at its opening parenthesis),
 * with its top-level arguments as source text. Parentheses, brackets and
 * braces nest, and string literals are skipped, so
 * `user.type(screen.getByRole('textbox'), 'a{Enter}')` has two arguments.
 */
function calls(source: string, opener: RegExp): { name: string; args: string[] }[] {
  const found: { name: string; args: string[] }[] = []
  for (const match of source.matchAll(opener)) {
    const args: string[] = []
    let depth = 0
    let start = (match.index ?? 0) + match[0].length
    let quote = ''
    for (let i = start; i < source.length; i++) {
      const ch = source[i] as string
      if (quote) {
        if (ch === '\\') i++
        else if (ch === quote) quote = ''
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch
      else if (ch === '(' || ch === '[' || ch === '{') depth++
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (depth === 0) {
          if (source.slice(start, i).trim()) args.push(source.slice(start, i).trim())
          break
        }
        depth--
      } else if (ch === ',' && depth === 0) {
        args.push(source.slice(start, i).trim())
        start = i + 1
      }
    }
    found.push({ name: match[0].startsWith('fireEvent') ? 'fireEvent' : match[0], args })
  }
  return found
}

function unescape(literal: string): string {
  return literal.replace(/\\(.)/g, '$1')
}

/** Every distinct chord a keyboard table names, normalized. */
export function documentedKeys(rows: readonly KeyRow[] | undefined): string[] {
  return [...new Set((rows ?? []).flatMap((row) => row.keys.map(normalizeChord)))]
}

/** The documented chords that none of the sources press, in table order. */
export function untestedKeys(rows: readonly KeyRow[] | undefined, sources: readonly string[]): string[] {
  const pressed = new Set(sources.flatMap((source) => [...pressedKeys(source)]))
  return documentedKeys(rows).filter((chord) => !pressed.has(chord))
}
