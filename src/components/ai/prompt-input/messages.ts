/** The words PromptInput says on its own. */
export interface PromptInputMessages {
  /** The field's hint when `placeholder` is not set. Never its name: `label` is. */
  placeholder: string
  /** The shortcut hint with `submitOn="enter"`. */
  enterToSend: string
  /** The shortcut hint with `submitOn="mod-enter"`. */
  modEnterToSend: string
  /** Said in place of the shortcut hint while `status` is `offline`. */
  offline: string
  /** The token estimate as shown, short. `{count}` is the estimate, written in the locale. */
  estimate: string
  /** The token estimate as a screen reader hears it. `{count}` is the estimate, written in the locale. */
  estimateSpoken: string
  /** The button that stops a streaming response. */
  stop: string
  /** The send button. */
  send: string
}

export const promptInputMessages: PromptInputMessages = {
  placeholder: 'Ask anything…',
  enterToSend: 'Enter to send, Shift+Enter for a new line',
  modEnterToSend: '⌘/Ctrl+Enter to send',
  offline: 'Offline — your draft is kept',
  estimate: '~{count} tok',
  estimateSpoken: 'About {count} tokens',
  stop: 'Stop',
  send: 'Send',
}

/** The words AttachmentChip says on its own. */
export interface AttachmentChipMessages {
  /** The remove button's name. `{name}` is the attachment's name. */
  remove: string
}

export const attachmentChipMessages: AttachmentChipMessages = {
  remove: 'Remove {name}',
}
