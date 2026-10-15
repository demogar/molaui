/** The words Stepper says on its own. */
export interface StepperMessages {
  /** The button that returns to the previous step. */
  back: string
  /** The submit button on every step but the last. */
  continue: string
  /** The submit button on the last step. */
  finish: string
  /** The line above the panel heading. `{position}` is the step's number, `{total}` how many there are. */
  stepOf: string
  /** The word under each step's title in the list, by state. */
  states: {
    upcoming: string
    current: string
    complete: string
    invalid: string
  }
}

export const stepperMessages: StepperMessages = {
  back: 'Back',
  continue: 'Continue',
  finish: 'Finish',
  stepOf: 'Step {position} of {total}',
  states: { upcoming: 'To do', current: 'Current', complete: 'Done', invalid: 'Needs fixing' },
}
