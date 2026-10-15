import type { ConfidenceLevel } from './confidence'

/** The words Confidence says on its own. */
export interface ConfidenceMessages {
  /** The word beside the segments, by level. */
  levels: Record<ConfidenceLevel, string>
}

export const confidenceMessages: ConfidenceMessages = {
  levels: {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  },
}

/** The words UncertaintyNote says on its own. */
export interface UncertaintyNoteMessages {
  /** The note's heading and accessible name when `title` is not set. */
  title: string
}

export const uncertaintyNoteMessages: UncertaintyNoteMessages = {
  title: 'The model is unsure',
}
