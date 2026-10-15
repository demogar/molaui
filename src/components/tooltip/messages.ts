/** The words Tooltip says on its own. */
export interface TooltipMessages {
  /**
   * Spoken names for the key glyphs a screen reader cannot say, read after
   * the content: `['⌘', '⇧', 'R']` is heard as "Command Shift R". A key with
   * no entry is read as written.
   */
  keys: Record<string, string>
}

export const tooltipMessages: TooltipMessages = {
  keys: {
    '⌘': 'Command',
    '⇧': 'Shift',
    '⌥': 'Option',
    '⌃': 'Control',
    '⏎': 'Enter',
    '↵': 'Enter',
    '⌫': 'Backspace',
    '⌦': 'Delete',
    '⎋': 'Escape',
    '⇥': 'Tab',
    '↑': 'Up arrow',
    '↓': 'Down arrow',
    '←': 'Left arrow',
    '→': 'Right arrow',
    Esc: 'Escape',
    Ctrl: 'Control',
    Cmd: 'Command',
    '.': 'Period',
    ',': 'Comma',
    '/': 'Slash',
  },
}
