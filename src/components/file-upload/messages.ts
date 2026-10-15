import type { PluralMessage } from '../../lib/messages'

/**
 * The words FileUpload says on its own. `{name}` is a file's name, `{count}`
 * a number of files.
 */
export interface FileUploadMessageTemplates {
  /** Before the browse button: "Drag files here, or". */
  prompt: { single: string; multiple: string }
  /** The browse button's text. */
  browse: { single: string; multiple: string }
  /** The headline and announcement while files are over the zone. */
  dropToAdd: PluralMessage
  /** The same, when the browser does not say how many files are coming. */
  dropToAddUnknown: string
  /** Announced after a batch, for the files that were added. */
  added: PluralMessage
  /** Announced after a batch, for the files that were turned away; follows `added`. */
  notAdded: PluralMessage
  /** Announced when a file is removed from the list. */
  removed: string
  /** The status word on each row. */
  status: { attached: string; queued: string; uploading: string; done: string; failed: string }
  /** Each row's remove button. */
  remove: string
  /** A failed row's retry button, its full accessible name. */
  retry: string
  /** The visible text of the retry button; `retry` is its accessible name. */
  retryShort: string
  /** Announced when a file finishes uploading. */
  uploaded: string
  /** Announced when a file fails to upload. */
  failedToUpload: string
  /** A file of a type `accept` refuses. `{types}` is the accepted types, as a list. */
  rejectType: string
  /** A file over `maxSize`. `{size}` is its size, `{limit}` the limit. */
  rejectSize: string
  /** A file past `maxFiles`. `{count}` is the limit. */
  rejectCount: PluralMessage
  /** In the constraint line, the size limit for a single file. `{limit}` is the size. */
  upTo: string
  /** In the constraint line, the size limit when several files are allowed. `{limit}` is the size. */
  upToEach: string
  /** In the constraint line, how many files are allowed. `{count}` is `maxFiles`. */
  atMost: PluralMessage
  /** Accessible name of the file list. */
  list: string
}

export const fileUploadMessages: FileUploadMessageTemplates = {
  prompt: { single: 'Drag a file here, or', multiple: 'Drag files here, or' },
  browse: { single: 'Browse', multiple: 'Browse files' },
  dropToAdd: { one: 'Drop to add {count} file', other: 'Drop to add {count} files' },
  dropToAddUnknown: 'Drop to add files',
  added: { one: 'Added {count} file.', other: 'Added {count} files.' },
  notAdded: { one: '{count} file was not added.', other: '{count} files were not added.' },
  removed: 'Removed {name}.',
  status: { attached: 'Attached', queued: 'Queued', uploading: 'Uploading', done: 'Uploaded', failed: 'Failed' },
  remove: 'Remove {name}',
  retry: 'Retry {name}',
  retryShort: 'Retry',
  uploaded: '{name} uploaded.',
  failedToUpload: '{name} failed to upload.',
  rejectType: '{name} is not an accepted type. Use {types}.',
  rejectSize: '{name} is {size}; the limit is {limit}.',
  rejectCount: {
    one: '{name} was not added: the limit is {count} file.',
    other: '{name} was not added: the limit is {count} files.',
  },
  upTo: 'up to {limit}',
  upToEach: 'up to {limit} each',
  atMost: { one: '{count} file at most', other: '{count} files at most' },
  list: 'Files',
}
