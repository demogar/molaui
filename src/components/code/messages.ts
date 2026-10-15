/** The words CodeBlock says on its own. */
export interface CodeBlockMessages {
  /** The wrap toggle, while lines are not wrapped. */
  wrap: string
  /** The wrap toggle, while lines are wrapped. */
  unwrap: string
  /** The copy button. */
  copy: string
  /** The copy button's name for a moment after it worked. */
  copied: string
  /** Announced when the copy worked. */
  copiedAnnouncement: string
}

export const codeBlockMessages: CodeBlockMessages = {
  wrap: 'Wrap lines',
  unwrap: 'Do not wrap lines',
  copy: 'Copy to clipboard',
  copied: 'Copied',
  copiedAnnouncement: 'Copied to clipboard',
}
