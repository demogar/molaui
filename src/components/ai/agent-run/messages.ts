import type { AgentStepKind } from './agent-run'
import type { RunStatusValue } from '../run-status/run-status'

/** The words AgentRun says on its own. */
export interface AgentRunMessages {
  /** The small label over each step's title, by kind of step. */
  kinds: Record<AgentStepKind, string>
  /**
   * What the polite status region says when the run changes state, by status.
   * One sentence each, so a translation can put the status word wherever the
   * language wants it.
   */
  announce: Record<RunStatusValue, string>
  /** The header button that stops an open run. */
  cancelRun: string
  /** The header button that runs it again after it failed, timed out or was cancelled. */
  retryRun: string
  /** The accessible name of the list of steps. `{name}` is the agent's name. */
  steps: string
  /** The copy button's name beside the run id. */
  copyRunId: string
  /** The copy button's name, and the announcement, once the run id is copied. */
  runIdCopied: string
}

export const agentRunMessages: AgentRunMessages = {
  kinds: {
    reasoning: 'Reasoning',
    tool: 'Tool call',
    message: 'Message',
    handoff: 'Handoff',
    approval: 'Approval',
  },
  announce: {
    queued: 'Run queued.',
    running: 'Run running.',
    streaming: 'Run streaming.',
    waiting: 'Run needs approval.',
    succeeded: 'Run succeeded.',
    failed: 'Run failed.',
    cancelled: 'Run cancelled.',
    timed_out: 'Run timed out.',
  },
  cancelRun: 'Cancel run',
  retryRun: 'Retry run',
  steps: 'Steps of {name}',
  copyRunId: 'Copy run id',
  runIdCopied: 'Run id copied',
}
