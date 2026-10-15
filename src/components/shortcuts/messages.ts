/**
 * How a key binding is printed and spoken: the glyphs on a Mac's keys and
 * everyone else's, the words a screen reader hears, and the group a binding
 * with none falls into. Keys are `KeyboardEvent.key` values in lower case
 * (`escape`, `arrowup`, `?`); a key not listed is printed as typed, in capitals.
 */
export interface HotkeysMessages {
  /** Modifiers on a Mac's keycaps: ⌘ ⌃ ⌥ ⇧. */
  appleGlyphs: Record<'mod' | 'meta' | 'ctrl' | 'alt' | 'shift', string>
  /** Modifiers on everyone else's keycaps: Ctrl, Alt, Shift. */
  otherGlyphs: Record<'mod' | 'meta' | 'ctrl' | 'alt' | 'shift', string>
  /** Modifiers in words on a Mac, for a screen reader: Command, Option. */
  appleWords: Record<'mod' | 'meta' | 'ctrl' | 'alt' | 'shift', string>
  /** Modifiers in words elsewhere: Control, Alt. */
  otherWords: Record<'mod' | 'meta' | 'ctrl' | 'alt' | 'shift', string>
  /** Named keys as a keycap prints them: Esc, ↵, ↑. */
  keyGlyphs: Record<string, string>
  /** Named keys in words: Escape, Up arrow, Question mark. */
  keyWords: Record<string, string>
  /** Between the steps of a sequence, in words. `{first}` and `{next}` are steps: "G, then D". */
  then: string
  /** Between the steps of a sequence, printed between the keycaps. */
  thenShort: string
  /** The group a binding without one is listed under, first in the dialog. */
  general: string
}

export const hotkeysMessages: HotkeysMessages = {
  appleGlyphs: { mod: '⌘', meta: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' },
  otherGlyphs: { mod: 'Ctrl', meta: 'Win', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' },
  appleWords: { mod: 'Command', meta: 'Command', ctrl: 'Control', alt: 'Option', shift: 'Shift' },
  otherWords: { mod: 'Control', meta: 'Windows', ctrl: 'Control', alt: 'Alt', shift: 'Shift' },
  keyGlyphs: {
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
  },
  keyWords: {
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
  },
  then: '{first}, then {next}',
  thenShort: 'then',
  general: 'General',
}

/** The words ShortcutsDialog says on its own. */
export interface ShortcutsDialogMessages {
  /** The title, when `title` is not set. */
  title: string
  /** Its own binding's label in the list. */
  show: string
  /** Shown when nothing is bound. */
  empty: string
}

export const shortcutsDialogMessages: ShortcutsDialogMessages = {
  title: 'Keyboard shortcuts',
  show: 'Show keyboard shortcuts',
  empty: 'No keyboard shortcuts are bound on this page.',
}
