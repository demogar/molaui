/** The words Dialog says on its own. */
export interface DialogMessages {
  /** The corner close button's accessible name. */
  close: string
}

export const dialogMessages: DialogMessages = {
  close: 'Close',
}

/** The words AlertDialog says on its own. */
export interface AlertDialogMessages {
  /** The safe answer, when `cancelLabel` is not set. */
  cancel: string
  /** The label of the confirmation field. `{text}` is where `confirmationText` goes, set as code. */
  typeToConfirm: string
}

export const alertDialogMessages: AlertDialogMessages = {
  cancel: 'Cancel',
  typeToConfirm: 'Type {text} to confirm.',
}
