/** The words Link and LinkButton say on their own. */
export interface LinkMessages {
  /**
   * Read after the label of a link that opens a new tab, where the arrow
   * glyph says it to the eye. Written with its parentheses, so a screen
   * reader pauses before it.
   */
  newTab: string
}

export const linkMessages: LinkMessages = {
  newTab: '(opens in a new tab)',
}
