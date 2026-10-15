/** The words RunStatus says on its own. */
export interface RunStatusMessages {
  /**
   * The word for each status, beside its glyph. One vocabulary for runs,
   * steps and tool calls, so AgentRun and ToolCall read these too.
   */
  statuses: {
    /** Accepted, not started. */
    queued: string
    /** Working, size unknown. */
    running: string
    /** Working, output arriving. */
    streaming: string
    /** Holding for a person. */
    waiting: string
    /** Finished well. */
    succeeded: string
    /** Broke. */
    failed: string
    /** Stopped by a person. */
    cancelled: string
    /** Ran out of time. */
    timed_out: string
  }
}

export const runStatusMessages: RunStatusMessages = {
  statuses: {
    queued: 'Queued',
    running: 'Running',
    streaming: 'Streaming',
    waiting: 'Needs approval',
    succeeded: 'Succeeded',
    failed: 'Failed',
    cancelled: 'Cancelled',
    timed_out: 'Timed out',
  },
}
