import type { PluralMessage } from '../../../lib/messages'

/** The words ToolCall says on its own. */
export interface ToolCallMessages {
  /** The label over the arguments the model sent. */
  arguments: string
  /** The label over what came back. */
  result: string
  /** The label over the error, when a RunError above already raised the alarm. */
  error: string
  /** The heading of a call that timed out. */
  timedOut: string
  /** The heading of a call that failed. */
  failed: string
  /** The retry button beside the error. */
  retry: string
  /** The heading of a call held for a person. */
  needsApproval: string
  /** The approve button, unless `approval.approveLabel` is set. */
  approve: string
  /** The deny button, unless `approval.denyLabel` is set. */
  deny: string
}

export const toolCallMessages: ToolCallMessages = {
  arguments: 'arguments',
  result: 'result',
  error: 'error',
  timedOut: 'The tool did not answer in time.',
  failed: 'The tool returned an error.',
  retry: 'Retry call',
  needsApproval: 'This call needs your approval.',
  approve: 'Approve',
  deny: 'Deny',
}

/** The words ToolCallGroup says on its own. */
export interface ToolCallGroupMessages {
  /** The group's name and visible label, unless `label` is set. `{count}` is how many calls ran together. */
  label: PluralMessage
}

export const toolCallGroupMessages: ToolCallGroupMessages = {
  label: { other: '{count} tools in parallel' },
}
