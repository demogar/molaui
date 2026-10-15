/**
 * The words Markdown says on its own. The cue after a link that opens a new
 * tab is Link's (`link.newTab`), so it is translated once for both.
 */
export interface MarkdownMessages {
  /** Spoken once when a stream that was running completes, when `doneAnnouncement` is not set. */
  done: string
  /** Spoken once when a stream that was running fails, when `errorAnnouncement` is not set. */
  error: string
}

export const markdownMessages: MarkdownMessages = {
  done: 'Response complete.',
  error: 'Response stopped with an error.',
}
