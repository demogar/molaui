import type { PluralMessage } from '../../../lib/messages'

/** The words RunError says on its own. */
export interface RunErrorMessages {
  /** The status word for each reason, beside the glyph and in the copied details. */
  kinds: {
    failed: string
    rate_limited: string
    timed_out: string
    cancelled: string
  }
  /** The plain sentence for a failure in a named tool. `{tool}` is the tool, as the model called it. */
  failedTool: string
  /** The plain sentence for a failure with no tool named. */
  failed: string
  /** The plain sentence for a rate limit. */
  rateLimited: string
  /** The plain sentence for a timeout in a named tool. `{tool}` is the tool. */
  timedOutTool: string
  /** The plain sentence for a timeout with no tool named. */
  timedOut: string
  /** The plain sentence for a cancellation. */
  cancelled: string
  /** The step's position, in the headline. `{n}` is its number. */
  step: string
  /** The step's position when the run's length is known. `{n}` is its number, `{count}` the run's steps. */
  stepOf: string
  /** The headline when the step is known. `{place}` is its position, its words, or both joined by `place`. */
  stoppedAt: string
  /** The step's position and its words together, for `{place}`. `{where}` is the position, `{step}` the words. */
  place: string
  /** The headline when the step is unknown, for each reason. */
  headlines: {
    failed: string
    rate_limited: string
    timed_out: string
    cancelled: string
  }
  /** While an automatic retry waits: read with the error (`{time}` spelled out) and shown under it (`{time}` ticking). */
  retryingIn: string
  /** While a manual retry waits: read with the error (`{time}` spelled out) and shown under it (`{time}` ticking). */
  canRetryIn: string
  /** Announced at ten seconds left before an automatic retry. */
  retryingInTen: string
  /** Announced at ten seconds left before a retry is allowed. */
  canRetryInTen: string
  /** Shown and announced when the automatic retry starts. */
  retryingNow: string
  /** Shown and announced when a retry is allowed again. */
  canRetryNow: string
  /** Shown before the clock is known, with an automatic retry. */
  retryingAfterWait: string
  /** Shown before the clock is known, with a manual retry. */
  canRetryAfterWait: string
  /** Seconds, spelled out for a screen reader. */
  seconds: PluralMessage
  /** Minutes, spelled out for a screen reader. */
  minutes: PluralMessage
  /** Minutes and seconds together. `{minutes}` and `{seconds}` are each spelled out. */
  minutesAndSeconds: string
  /** The retry-from-step button. `{n}` is the step's number. */
  retryFromStep: string
  /** The retry-from-step button when the step has no number. */
  retryFromThisStep: string
  /** The retry-run button. */
  retryRun: string
  /** The copy button. */
  copyDetails: string
  /** Announced once the details are on the clipboard. */
  detailsCopied: string
  /** The copied details' lines. `{value}` is the fact. */
  detailsStatus: string
  detailsRun: string
  detailsStep: string
  detailsTool: string
  detailsError: string
  detailsAt: string
  /** The step in the copied details: its number and, when known, the run's length. `{n}` and `{count}`. */
  detailsStepOf: string
}

export const runErrorMessages: RunErrorMessages = {
  kinds: {
    failed: 'Failed',
    rate_limited: 'Rate limited',
    timed_out: 'Timed out',
    cancelled: 'Cancelled',
  },
  failedTool: '{tool} returned an error, so the run stopped. Work before this step is kept.',
  failed: 'The step returned an error, so the run stopped. Work before this step is kept.',
  rateLimited:
    'The model provider turned the request away because this workspace sent too many in a short time. Nothing is broken, and work before this step is kept.',
  timedOutTool: '{tool} did not answer in time. What arrived before the deadline is kept.',
  timedOut: 'The step did not finish in time. What arrived before the deadline is kept.',
  cancelled: 'You stopped the run. Nothing after this step ran, and what arrived before it is kept.',
  step: 'step {n}',
  stepOf: 'step {n} of {count}',
  stoppedAt: 'Stopped at {place}.',
  place: '{where}: {step}',
  headlines: {
    failed: 'The run failed.',
    rate_limited: 'The run rate limited.',
    timed_out: 'The run timed out.',
    cancelled: 'The run cancelled.',
  },
  retryingIn: 'Retrying automatically in {time}.',
  canRetryIn: 'You can retry in {time}.',
  retryingInTen: 'Retrying in 10 seconds.',
  canRetryInTen: 'You can retry in 10 seconds.',
  retryingNow: 'Retrying now.',
  canRetryNow: 'You can retry now.',
  retryingAfterWait: 'Retrying automatically after the wait.',
  canRetryAfterWait: 'You can retry after the wait.',
  seconds: { one: '{count} second', other: '{count} seconds' },
  minutes: { one: '{count} minute', other: '{count} minutes' },
  minutesAndSeconds: '{minutes} {seconds}',
  retryFromStep: 'Retry from step {n}',
  retryFromThisStep: 'Retry from this step',
  retryRun: 'Retry run',
  copyDetails: 'Copy error details',
  detailsCopied: 'Error details copied.',
  detailsStatus: 'Status: {value}',
  detailsRun: 'Run: {value}',
  detailsStep: 'Step: {value}',
  detailsTool: 'Tool: {value}',
  detailsError: 'Error: {value}',
  detailsAt: 'At: {value}',
  detailsStepOf: '{n} of {count}',
}

/** The words PartialOutput says on its own. */
export interface PartialOutputMessages {
  /** The label above the kept output. */
  label: string
  /** The line under it, unless `note` is set. */
  note: string
}

export const partialOutputMessages: PartialOutputMessages = {
  label: 'Partial output',
  note: 'Output stops here. The rest never arrived.',
}
