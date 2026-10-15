/** The words StreamingText says on its own. */
export interface StreamingTextMessages {
  /** Announced once when a running stream completes, unless `doneAnnouncement` is set. */
  done: string
  /** Announced once when a running stream fails, unless `errorAnnouncement` is set. */
  error: string
}

export const streamingTextMessages: StreamingTextMessages = {
  done: 'Response complete.',
  error: 'Response stopped with an error.',
}
