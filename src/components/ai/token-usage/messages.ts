/** The words TokenUsage says on its own. */
export interface TokenUsageMessages {
  /** After the input count in the inline variant: "12.4k in". `{count}` is the compact count. */
  inlineInput: string
  /** After the output count in the inline variant: "3.1k out". `{count}` is the compact count. */
  inlineOutput: string
  /** Term for tokens sent to the model. */
  input: string
  /** Term for input tokens served from cache. */
  cached: string
  /** Term for tokens the model produced. */
  output: string
  /** Term for the cost. */
  cost: string
  /** Label above the context meter. */
  context: string
  /** The warning word at 80% of the context window. */
  nearLimit: string
  /** The warning word at 95% of the context window. */
  atLimit: string
  /** The meter's accessible name. */
  meterLabel: string
  /** What the meter reads below 80%. `{percent}` is a whole number. */
  meterValue: string
  /** What the meter reads from 80%. `{percent}` is a whole number. */
  meterValueNear: string
  /** What the meter reads from 95%. `{percent}` is a whole number. */
  meterValueAt: string
}

export const tokenUsageMessages: TokenUsageMessages = {
  inlineInput: '{count} in',
  inlineOutput: '{count} out',
  input: 'Input',
  cached: 'Cached',
  output: 'Output',
  cost: 'Cost',
  context: 'Context',
  nearLimit: 'Near the limit',
  atLimit: 'At the limit',
  meterLabel: 'Context window used',
  meterValue: '{percent}% of the context window',
  meterValueNear: '{percent}% of the context window, near the limit',
  meterValueAt: '{percent}% of the context window, at the limit',
}
