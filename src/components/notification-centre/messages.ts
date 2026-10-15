import type { PluralMessage } from '../../lib/messages'

/** The words NotificationList and NotificationCentre say on their own. */
export interface NotificationsMessages {
  /** The list's name, the popover's title and the bell's name, when `label` is not set. */
  label: string
  /** Shown when there is nothing, when `empty` is not set. */
  empty: string
  /** Read before an unread item's title. */
  unread: string
  /** The visible mark on an unread item. */
  new: string
  /** Read before a success item's title, so the tone is not colour alone. */
  success: string
  /** Read before a warning item's title. */
  warn: string
  /** Read before a danger item's title. */
  danger: string
  /** The button that marks every item read. */
  markAllRead: string
  /** The bell's name while something is unread. `{label}` is its name, `{count}` the unread count. */
  bellUnread: PluralMessage
  /** The badge past 99. `{max}` is 99. */
  overflow: string
}

export const notificationsMessages: NotificationsMessages = {
  label: 'Notifications',
  empty: 'No notifications yet.',
  unread: 'Unread.',
  new: 'New',
  success: 'Success:',
  warn: 'Warning:',
  danger: 'Error:',
  markAllRead: 'Mark all as read',
  bellUnread: { other: '{label}, {count} unread' },
  overflow: '{max}+',
}
