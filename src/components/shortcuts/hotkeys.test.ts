import { describe, expect, it } from 'vitest'

import { describeHotkey, formatHotkey, isTypingTarget, matchesChord, normalizeHotkey, parseHotkey } from './hotkeys'

const key = (init: Partial<KeyboardEvent>) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init })

describe('parseHotkey', () => {
  it('reads chords, sequences and aliases', () => {
    expect(parseHotkey('mod+shift+K')).toEqual([{ key: 'k', mod: true, ctrl: false, meta: false, alt: false, shift: true }])
    expect(parseHotkey('g d').map((c) => c.key)).toEqual(['g', 'd'])
    expect(parseHotkey('esc')[0]!.key).toBe('escape')
    expect(parseHotkey('mod++')[0]).toMatchObject({ key: '+', mod: true })
    expect(normalizeHotkey('Control+K')).toBe(normalizeHotkey('ctrl+k'))
  })

  it('refuses a chord with no key', () => {
    expect(() => parseHotkey('')).toThrow(/no key/)
  })
})

describe('matchesChord', () => {
  const modK = parseHotkey('mod+k')[0]!

  it('reads mod as ⌘ on Apple platforms and Ctrl elsewhere, never both', () => {
    expect(matchesChord(key({ key: 'k', metaKey: true }), modK, 'apple')).toBe(true)
    expect(matchesChord(key({ key: 'k', ctrlKey: true }), modK, 'apple')).toBe(false)
    expect(matchesChord(key({ key: 'k', ctrlKey: true }), modK, 'other')).toBe(true)
    expect(matchesChord(key({ key: 'k', metaKey: true }), modK, 'other')).toBe(false)
  })

  it('needs exactly the modifiers it names', () => {
    expect(matchesChord(key({ key: 'k', ctrlKey: true, altKey: true }), modK, 'other')).toBe(false)
    expect(matchesChord(key({ key: 'K', ctrlKey: true, shiftKey: true }), modK, 'other')).toBe(false)
    expect(matchesChord(key({ key: 'K', ctrlKey: true, shiftKey: true }), parseHotkey('mod+shift+k')[0]!, 'other')).toBe(true)
  })

  it('takes a symbol as typed, whatever shift it needed', () => {
    expect(matchesChord(key({ key: '?', shiftKey: true }), parseHotkey('?')[0]!, 'other')).toBe(true)
  })

  it('falls back to the physical key only when the typed character is not ASCII', () => {
    const altK = parseHotkey('alt+k')[0]!
    // Option-K on a Mac types ˚.
    expect(matchesChord(key({ key: '˚', code: 'KeyK', altKey: true }), altK, 'apple')).toBe(true)
    // AZERTY's A sits where QWERTY has Q: it is `a`, not `q`.
    expect(matchesChord(key({ key: 'a', code: 'KeyQ' }), parseHotkey('q')[0]!, 'other')).toBe(false)
  })
})

describe('isTypingTarget', () => {
  it('is true for text fields, selects and editable regions, false for buttons and checkboxes', () => {
    const make = (html: string) => {
      document.body.innerHTML = html
      return document.body.firstElementChild!
    }
    expect(isTypingTarget(make('<input type="text">'))).toBe(true)
    expect(isTypingTarget(make('<input type="search">'))).toBe(true)
    expect(isTypingTarget(make('<textarea></textarea>'))).toBe(true)
    expect(isTypingTarget(make('<select></select>'))).toBe(true)
    expect(isTypingTarget(make('<div contenteditable="true"><p>x</p></div>').firstElementChild)).toBe(true)
    expect(isTypingTarget(make('<input type="checkbox">'))).toBe(false)
    expect(isTypingTarget(make('<button>Run</button>'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('formatHotkey and describeHotkey', () => {
  it('print each platform’s own glyphs, in its own order', () => {
    expect(formatHotkey('mod+shift+r', 'apple')).toEqual([['⇧', '⌘', 'R']])
    expect(formatHotkey('mod+shift+r', 'other')).toEqual([['Ctrl', 'Shift', 'R']])
    expect(formatHotkey('g d', 'other')).toEqual([['G'], ['D']])
    expect(formatHotkey('?', 'apple')).toEqual([['?']])
    expect(formatHotkey('f6', 'other')).toEqual([['F6']])
  })

  it('say the keys in words, because ⌘ is not read as Command', () => {
    expect(describeHotkey('mod+k', 'apple')).toBe('Command K')
    expect(describeHotkey('mod+k', 'other')).toBe('Control K')
    expect(describeHotkey('g e', 'other')).toBe('G, then E')
    expect(describeHotkey('?', 'other')).toBe('Question mark')
  })
})
