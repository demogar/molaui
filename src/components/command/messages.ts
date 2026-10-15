import type { PluralMessage } from '../../lib/messages'

/** The words CommandPalette says on its own. */
export interface CommandPaletteMessages {
  /** The dialog's and the input's accessible name, when `label` is not set. */
  label: string
  /** The empty input's placeholder, when `placeholder` is not set. */
  placeholder: string
  /** The key hint beside the input. */
  escape: string
  /** Names the list of matches. */
  commands: string
  /** Shown when nothing matches, without `renderEmpty`. `{query}` is the bold query. */
  noMatches: string
  /** The footer hint beside the arrow keys. */
  move: string
  /** The footer hint beside the return key. */
  select: string
  /** The count of matches, in the footer and announced after a pause. */
  results: PluralMessage
}

export const commandPaletteMessages: CommandPaletteMessages = {
  label: 'Command palette',
  placeholder: 'Type a command or search…',
  escape: 'esc',
  commands: 'Commands',
  noMatches: 'No matches for “{query}”.',
  move: 'move',
  select: 'select',
  results: { one: '{count} result', other: '{count} results' },
}
