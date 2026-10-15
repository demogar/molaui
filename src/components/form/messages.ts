import type { PluralMessage } from '../../lib/messages'

/** The words FormErrorSummary says on its own. */
export interface FormErrorSummaryMessages {
  /** The heading, when `title` is not set. `{count}` is how many fields have errors. */
  title: PluralMessage
}

export const formErrorSummaryMessages: FormErrorSummaryMessages = {
  title: { one: '{count} field needs fixing', other: '{count} fields need fixing' },
}
