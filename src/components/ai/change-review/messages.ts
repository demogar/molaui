import type { PluralMessage } from '../../../lib/messages'
import type { ChangeDecisionStatus } from './change-review'
import type { FileChangeKind } from './file-diff'

/** The words ChangeCount says on its own. */
export interface ChangeCountMessages {
  /** A number of lines. `{count}` is the number, written in the locale. */
  lines: PluralMessage
  /** What a screen reader hears instead of "+12 −3". `{added}` and `{removed}` are `lines` filled in. */
  summary: string
}

export const changeCountMessages: ChangeCountMessages = {
  lines: { one: '{count} line', other: '{count} lines' },
  summary: '{added} added, {removed} removed',
}

/** The words ChangeReview says on its own. */
export interface ChangeReviewMessages {
  /** The outcome's word, by decision. */
  decisions: Record<ChangeDecisionStatus, string>
  /** The three decision buttons. */
  actions: Record<ChangeDecisionStatus, string>
  /** The field error when Reject or Request changes is pressed with no reason. */
  missingReason: Record<Exclude<ChangeDecisionStatus, 'approved'>, string>
  /** The small label over the title. */
  proposedChange: string
  /** Who proposed it. `{agent}` is the agent's name, set in bold. */
  proposedBy: string
  /** The reason field's label. */
  reason: string
  /** The hint under the reason field, saying when a reason is needed. */
  reasonHint: string
  /** The accessible name of the group of decision buttons. */
  decision: string
  /** Who decided, after the outcome's word. `{reviewer}` is the reviewer's name. */
  decidedBy: string
}

export const changeReviewMessages: ChangeReviewMessages = {
  decisions: {
    approved: 'Approved',
    changes_requested: 'Changes requested',
    rejected: 'Rejected',
  },
  actions: {
    approved: 'Approve',
    changes_requested: 'Request changes',
    rejected: 'Reject',
  },
  missingReason: {
    changes_requested: 'Say what needs to change, so the agent can revise it.',
    rejected: 'Say why you are rejecting it, so the agent does not propose it again.',
  },
  proposedChange: 'Proposed change',
  proposedBy: 'Proposed by {agent}',
  reason: 'Reason',
  reasonHint: 'Needed to reject or request changes. Optional when you approve.',
  decision: 'Decision',
  decidedBy: 'by {reviewer}',
}

/** The words FieldChanges says on its own. */
export interface FieldChangesMessages {
  /** The count in the header. `{count}` is the number of fields. */
  fieldsChanged: PluralMessage
  /** Said before the old value; hidden, because the arrow shows it. */
  before: string
  /** Said before the new value; hidden, because the arrow shows it. */
  after: string
  /** A side with no value: a field the change adds or removes. */
  notSet: string
}

export const fieldChangesMessages: FieldChangesMessages = {
  fieldsChanged: { one: '{count} field changed', other: '{count} fields changed' },
  before: 'Before:',
  after: 'After:',
  notSet: 'not set',
}

/** The words FileDiff says on its own. */
export interface FileDiffMessages {
  /** The word beside the mark in the header, by what happened to the file. */
  kinds: Record<FileChangeKind, string>
  /** Said between the old and new path of a rename; the arrow shows it. */
  renamedTo: string
  /** Shown instead of hunks for a rename with no content change. */
  renamedOnly: string
  /** Shown instead of hunks when there are none. */
  noChanges: string
  /** Said before an added line; the glyph and wash show it. */
  added: string
  /** Said before a removed line; the glyph and wash show it. */
  removed: string
}

export const fileDiffMessages: FileDiffMessages = {
  kinds: {
    added: 'Added',
    modified: 'Modified',
    deleted: 'Deleted',
    renamed: 'Renamed',
  },
  renamedTo: 'renamed to',
  renamedOnly: 'Renamed without changes to its content.',
  noChanges: 'No line changes.',
  added: 'Added:',
  removed: 'Removed:',
}
