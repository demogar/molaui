/**
 * The grammar of a hotkey, and the three questions every keydown has to
 * answer before it runs one: does it match, is the person typing, and how is
 * it written on this platform.
 *
 * Kept free of React so the hook, the dialog and the tests read one parser.
 *
 * ── the grammar ──
 * A chord is keys joined by `+`: `mod+k`, `shift+arrowup`, `?`. A sequence is
 * chords separated by a space: `g d` is G, then D. Key names are
 * `KeyboardEvent.key` in lower case (`escape`, `arrowup`, `/`), with the
 * aliases people actually type (`esc`, `up`, `space`, `cmd`, `ctrl`).
 *
 * ── `mod` ──
 * `mod` is ⌘ on Apple platforms and Ctrl everywhere else. It is the one
 * modifier a cross-platform shortcut should use. `ctrl` and `meta` still mean
 * exactly those keys, for the rare binding that really wants them.
 *
 * `useCommandShortcut` used to accept ⌘K *and* Ctrl-K on every platform. On a
 * Mac, Ctrl-K is a text-editing key (delete to the end of the line) in every
 * native field, and taking it from a person mid-sentence is the hijack this
 * file exists to prevent; on Windows and Linux ⌘ is the Windows key, which
 * the system owns. Each platform now gets its own convention, once.
 */

export type HotkeyPlatform = 'apple' | 'other'

export interface Chord {
  /** `KeyboardEvent.key`, lower-cased and de-aliased: `k`, `escape`, `?`. */
  key: string
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

const MODIFIERS: Record<string, keyof Omit<Chord, 'key'>> = {
  mod: 'mod',
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
}

const ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  'left': 'arrowleft',
  'right': 'arrowright',
  del: 'delete',
  plus: '+',
}

/** `mod+shift+k` → one chord; `g d` → two. Throws on a chord with no key, which is a typo, not a shortcut. */
export function parseHotkey(keys: string): Chord[] {
  return keys
    .trim()
    .split(/\s+/)
    .map((step) => {
      const chord: Chord = { key: '', mod: false, ctrl: false, meta: false, alt: false, shift: false }
      // `mod++` is mod and plus: split on a `+` that has something after it.
      const parts = step.toLowerCase().split(/\+(?=.)/)
      parts.forEach((part, i) => {
        const modifier = MODIFIERS[part]
        if (modifier && i < parts.length - 1) chord[modifier] = true
        else chord.key = ALIASES[part] ?? part
      })
      if (!chord.key) throw new Error(`[mola-ui] "${keys}" has no key to press.`)
      return chord
    })
}

/** One canonical spelling, so `ctrl+K` and `control+k` are seen as the same binding. */
export function normalizeHotkey(keys: string): string {
  return parseHotkey(keys)
    .map((c) => [c.mod && 'mod', c.ctrl && 'ctrl', c.meta && 'meta', c.alt && 'alt', c.shift && 'shift', c.key].filter(Boolean).join('+'))
    .join(' ')
}

/**
 * Apple or not, from what the browser says. `userAgentData` where it exists,
 * then `platform`, which is deprecated but still the only answer Safari and
 * Firefox give. On the server there is no answer: `other`, and the dialog
 * that prints keys renders only in the browser.
 */
export function detectPlatform(): HotkeyPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const name = nav.userAgentData?.platform || nav.platform || nav.userAgent || ''
  return /mac|iphone|ipad|ipod/i.test(name) ? 'apple' : 'other'
}

/** A letter or digit: shift changes what it means. A symbol already says whether shift was held: `?` is shift and slash. */
const isAlnum = (key: string) => /^[a-z0-9]$/.test(key)

export function matchesChord(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, chord: Chord, platform: HotkeyPlatform): boolean {
  const wantCtrl = chord.ctrl || (chord.mod && platform === 'other')
  const wantMeta = chord.meta || (chord.mod && platform === 'apple')
  if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta || event.altKey !== chord.alt) return false
  const symbol = chord.key.length === 1 && !isAlnum(chord.key)
  if (!symbol && event.shiftKey !== chord.shift) return false
  const key = (event.key ?? '').toLowerCase()
  if (key === chord.key) return true
  // Option on a Mac turns K into ˚, and a Cyrillic layout turns it into л:
  // the key is still the one marked K. Fall back to the physical key only
  // when the typed character is not plain ASCII, so an AZERTY layout's A
  // (which sits where QWERTY has Q) still answers to `a`, not to `q`.
  if (isAlnum(chord.key) && !/^[\x20-\x7e]$/.test(event.key ?? '')) {
    return event.code === `Key${chord.key.toUpperCase()}` || event.code === `Digit${chord.key}`
  }
  return false
}

/** Whether a chord leaves text alone, so it may fire from inside a field: ⌘K from a search box. */
export function isCommandChord(chord: Chord): boolean {
  return chord.mod || chord.ctrl || chord.meta
}

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'])

/**
 * Whether the keydown is someone typing: into a text field, a select, a
 * contenteditable region or a widget that says it takes text. A plain-key
 * shortcut there would eat the letter.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false
  const el = target as HTMLElement
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') return !NOT_TEXT.has((el as HTMLInputElement).type)
  // `isContentEditable` is the property, but jsdom never sets it.
  return el.isContentEditable || el.closest('[contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"]') !== null
}

const APPLE_GLYPH = { mod: '⌘', meta: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' } as const
const OTHER_GLYPH = { mod: 'Ctrl', meta: 'Win', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' } as const
const APPLE_WORD = { mod: 'Command', meta: 'Command', ctrl: 'Control', alt: 'Option', shift: 'Shift' } as const
const OTHER_WORD = { mod: 'Control', meta: 'Windows', ctrl: 'Control', alt: 'Alt', shift: 'Shift' } as const

const KEY_GLYPH: Record<string, string> = {
  escape: 'Esc',
  enter: '↵',
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: '⌫',
  delete: 'Del',
  tab: 'Tab',
}

const KEY_WORD: Record<string, string> = {
  escape: 'Escape',
  enter: 'Enter',
  ' ': 'Space',
  arrowup: 'Up arrow',
  arrowdown: 'Down arrow',
  arrowleft: 'Left arrow',
  arrowright: 'Right arrow',
  backspace: 'Backspace',
  delete: 'Delete',
  tab: 'Tab',
  '?': 'Question mark',
  '/': 'Slash',
  '.': 'Period',
  ',': 'Comma',
}

function keyName(key: string, table: Record<string, string>) {
  if (table[key]) return table[key]
  if (/^f\d{1,2}$/.test(key)) return key.toUpperCase()
  return key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1)
}

/** ⌃⌥⇧⌘ is the Mac's order; Ctrl+Alt+Shift is everyone else's. */
const ORDER = {
  apple: ['ctrl', 'alt', 'shift', 'mod', 'meta'],
  other: ['mod', 'ctrl', 'alt', 'shift', 'meta'],
} as const

function modifiersOf(chord: Chord, platform: HotkeyPlatform) {
  return ORDER[platform].filter(
    (m) => chord[m] && !(m === 'shift' && chord.key.length === 1 && !isAlnum(chord.key)),
  )
}

/**
 * The keys as a keyboard prints them, one array per step: `mod+k` is
 * `[['⌘', 'K']]` on a Mac and `[['Ctrl', 'K']]` elsewhere. Modifiers in each
 * platform's own order (⌃⌥⇧⌘ on a Mac, Ctrl+Alt+Shift elsewhere). Shift is left off a symbol that
 * already needs it: `?` is printed `?`, not `⇧ ?`.
 */
export function formatHotkey(keys: string, platform: HotkeyPlatform): string[][] {
  const glyphs = platform === 'apple' ? APPLE_GLYPH : OTHER_GLYPH
  return parseHotkey(keys).map((chord) => [...modifiersOf(chord, platform).map((m) => glyphs[m]), keyName(chord.key, KEY_GLYPH)])
}

/** The same keys in words, for a screen reader: "Command K", "G, then D". A glyph like ⌘ is read as "place of interest sign", or not at all. */
export function describeHotkey(keys: string, platform: HotkeyPlatform): string {
  const words = platform === 'apple' ? APPLE_WORD : OTHER_WORD
  return parseHotkey(keys)
    .map((chord) => [...modifiersOf(chord, platform).map((m) => words[m]), keyName(chord.key, KEY_WORD)].join(' '))
    .join(', then ')
}
