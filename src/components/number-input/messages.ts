/** The words NumberInput says on its own. */
export interface NumberInputMessages {
  /** The + stepper's accessible name, when `incrementLabel` is not set. */
  increase: string
  /** The − stepper's accessible name, when `decrementLabel` is not set. */
  decrease: string
  /**
   * The role a screen reader announces for the field. Base UI sets
   * `aria-roledescription="Number field"` in English when nothing is passed.
   */
  roleDescription: string
}

export const numberInputMessages: NumberInputMessages = {
  increase: 'Increase',
  decrease: 'Decrease',
  roleDescription: 'Number field',
}
