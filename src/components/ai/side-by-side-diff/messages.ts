/** The words SideBySideDiff says on its own. */
export interface SideBySideDiffMessages {
  /** The old pane's name, when `beforeLabel` is not set. */
  before: string
  /** The new pane's name, when `afterLabel` is not set. */
  after: string
  /** Shown instead of the panes when nothing changed. */
  noChanges: string
  /** Said before an added line; the glyph and wash show it. */
  added: string
  /** Said before a removed line; the glyph and wash show it. */
  removed: string
}

export const sideBySideDiffMessages: SideBySideDiffMessages = {
  before: 'Before',
  after: 'After',
  noChanges: 'No line changes.',
  added: 'Added:',
  removed: 'Removed:',
}
