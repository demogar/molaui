import type { PluralMessage } from '../../lib/messages'

/** The words AvatarGroup says on its own. */
export interface AvatarGroupMessages {
  /** The name of the "+n" tile. `{count}` is how many people it stands for. */
  more: PluralMessage
}

export const avatarGroupMessages: AvatarGroupMessages = {
  more: { other: '{count} more' },
}
