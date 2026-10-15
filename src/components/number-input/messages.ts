/** The words NumberInput says on its own. */
export interface NumberInputMessages {
  /** The + stepper's accessible name, when `incrementLabel` is not set. */
  increase: string
  /** The − stepper's accessible name, when `decrementLabel` is not set. */
  decrease: string
}

export const numberInputMessages: NumberInputMessages = {
  increase: 'Increase',
  decrease: 'Decrease',
}
