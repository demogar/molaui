import type { MessageRole } from './message'

/** The words Message says on its own. */
export interface MessageMessages {
  /** The gutter label when `author` is not set, by role. */
  roles: Record<MessageRole, string>
  /** The heading of the error block when a response failed partway. */
  stopped: string
  /** The retry button in the error block. */
  retry: string
  /** The copy action's name. */
  copy: string
  /** The copy action's name once copied. */
  copied: string
  /** What a screen reader hears once the text is copied; the icon swap alone is silent. */
  copiedAnnouncement: string
  /** The action that regenerates the turn. */
  regenerate: string
  /** The thumbs-up rating. */
  goodResponse: string
  /** The thumbs-down rating. */
  badResponse: string
}

export const messageMessages: MessageMessages = {
  roles: {
    user: 'You',
    assistant: 'Assistant',
    system: 'System',
    tool: 'Tool',
  },
  stopped: 'The response stopped before it finished.',
  retry: 'Retry',
  copy: 'Copy response',
  copied: 'Copied',
  copiedAnnouncement: 'Copied to clipboard',
  regenerate: 'Regenerate',
  goodResponse: 'Good response',
  badResponse: 'Bad response',
}

/** The words Thread says on its own. */
export interface ThreadMessages {
  /** The button that appears once the reader scrolls away from the newest turn. */
  jumpToLatest: string
  /** The accessible name of the scrolling area. `{label}` is the thread's `label`. */
  transcript: string
}

export const threadMessages: ThreadMessages = {
  jumpToLatest: 'Jump to latest',
  transcript: '{label} transcript',
}
