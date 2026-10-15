/** The words Stat says on its own: the change, read as one sentence to a screen reader. */
export interface StatMessages {
  /** `{value}` is the delta's value: "Up 12%". */
  up: string
  /** `{value}` is the delta's value: "Down 3 ms". */
  down: string
  /** `{value}` is the delta's value: "Unchanged at 97.8". */
  unchanged: string
  /** Added when the sentiment is positive. */
  positive: string
  /** Added when the sentiment is negative. */
  negative: string
}

export const statMessages: StatMessages = {
  up: 'Up {value}',
  down: 'Down {value}',
  unchanged: 'Unchanged at {value}',
  positive: 'an improvement',
  negative: 'a regression',
}
