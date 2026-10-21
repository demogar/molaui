/** The words a toast says on its own. */
export interface ToastMessages {
  /** The close button on every toast. */
  dismiss: string
  /** Read before a success toast's title, so the tone is not colour alone. */
  success: string
  /** Read before a danger toast's title. */
  danger: string
  /** Read before a warning toast's title. */
  warn: string
  /** Read before a running toast's title. */
  running: string
  /** The F6 entry in the shortcuts dialog, inside a `HotkeysProvider`. */
  focusShortcut: string
  /**
   * The toast stack's region name, the landmark F6 moves focus to. Base UI
   * names the viewport "Notifications" in English when nothing is passed.
   */
  region: string
}

export const toastMessages: ToastMessages = {
  dismiss: 'Dismiss',
  success: 'Success:',
  danger: 'Error:',
  warn: 'Warning:',
  running: 'In progress:',
  focusShortcut: 'Move focus to new notifications',
  region: 'Notifications',
}
