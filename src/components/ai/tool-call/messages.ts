import type { PluralMessage } from '../../../lib/messages'
import type { ToolCallDecisionStatus } from './tool-call'

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
  /** The button that opens the argument fields, unless `approval.edit.label` is set. */
  editAndApprove: string
  /** The heading while the person edits the arguments. */
  editing: string
  /** The button that approves the edited arguments. */
  approveWithEdits: string
  /** The button that closes the fields and goes back to the proposal. */
  cancelEdits: string
  /** Why Approve with edits is unavailable while nothing has changed. */
  editUnchanged: string
  /** Said before the reason from `approval.edit.validate`. */
  editInvalid: string
  /** The outcome's word, by decision. */
  decisions: Record<ToolCallDecisionStatus, string>
  /** Who decided, after the outcome's word. `{name}` is `decision.by`. */
  decidedBy: string
  /** The outcome as one sentence for a screen reader. `{decision}` is the word and who; `{changes}` lists each change. */
  decidedWithChanges: string
  /** One changed argument in that sentence. `{field}`, `{before}`, `{after}`. */
  argumentChanged: string
  /** An argument the person added. `{field}`, `{after}`. */
  argumentAdded: string
  /** An argument the person removed. `{field}`, `{before}`. */
  argumentRemoved: string
  /** The label over the agent's arguments when the person edited them. */
  proposedArguments: string
  /** The label over the arguments that ran, when the person edited them. */
  editedArguments: string
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
  editAndApprove: 'Edit and approve',
  editing: 'Change the arguments, then approve.',
  approveWithEdits: 'Approve with edits',
  cancelEdits: 'Cancel edits',
  editUnchanged: 'Nothing has changed yet. Change an argument, or cancel and approve the call as proposed.',
  editInvalid: 'Can’t approve yet:',
  decisions: {
    approved: 'Approved',
    approved_with_edits: 'Approved with edits',
    denied: 'Denied',
  },
  decidedBy: 'by {name}',
  decidedWithChanges: '{decision}: {changes}.',
  argumentChanged: '{field} changed from {before} to {after}',
  argumentAdded: '{field} set to {after}',
  argumentRemoved: '{field} removed, was {before}',
  proposedArguments: 'arguments as proposed',
  editedArguments: 'arguments as approved',
}

/** The words ToolCallGroup says on its own. */
export interface ToolCallGroupMessages {
  /** The group's name and visible label, unless `label` is set. `{count}` is how many calls ran together. */
  label: PluralMessage
}

export const toolCallGroupMessages: ToolCallGroupMessages = {
  label: { other: '{count} tools in parallel' },
}
