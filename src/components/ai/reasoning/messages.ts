/** The words Reasoning says on its own. */
export interface ReasoningMessages {
  /** The summary line while the model is still thinking. */
  thinking: string
  /** The summary line once done, with a duration. `{duration}` is the time taken, "12.4s". */
  thoughtFor: string
  /** The summary line once done, when no duration is known. */
  reasoning: string
  /** Announced once when the reasoning finishes streaming. */
  complete: string
}

export const reasoningMessages: ReasoningMessages = {
  thinking: 'Thinking',
  thoughtFor: 'Thought for {duration}',
  reasoning: 'Reasoning',
  complete: 'Reasoning complete.',
}
