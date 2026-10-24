'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { Bell } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { useMergedRefs } from '../../lib/merge-props'
import { useControllable } from '../../lib/use-controllable'
import { Button, IconButton } from '../button'
import { floatingSurface } from '../popover/surface'
import { type NotificationsMessages, notificationsMessages } from './messages'

/**
 * Where a notification goes after its toast has gone: the record of what
 * happened, kept until the operator has read it.
 *
 * ── the toast is the moment, the centre is the record ──
 * A toast is ephemeral and capped at three, so the one that said "Re-index
 * failed" while the operator was in a meeting is gone. The centre keeps it.
 * The same event usually goes to both: the toast to say it now, the centre to
 * find it later. The centre never says it now. It has no live region, and its
 * unread count changes silently: the toast already announced the event, and a
 * second announcement for the same thing is the chattiness the toast region
 * was built to avoid. The count is in the bell's name ("Notifications, 3
 * unread"), so it is heard when someone goes to the bell.
 *
 * ── data, not a store ──
 * The list is a prop and the page owns it, because the page owns where
 * notifications come from (a socket, a poll, the toast calls it already
 * makes) and whether "read" is saved anywhere. `onMarkRead` and
 * `onMarkAllRead` say what the operator did; the page decides what it means.
 *
 * ── unread is a word and an edge, not a tint ──
 * An unread item has a heavy ink edge at its start (`bar-start-ink`, the
 * system's "this one" mark), its title in semibold, and the word New. A tinted
 * row alone would be state by colour, which the system does not do. The tone
 * is the toast's own cut square, so the record is recognisably the toast it
 * came from.
 *
 * The popover is Base UI's: it is non-modal, focus moves into it on open,
 * Escape and an outside press close it, and focus returns to the bell.
 */

/** The status of a notification: the toast tones, without `running` (a record is of something that has happened). */
export type NotificationTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger'

export interface NotificationItem {
  id: string
  /** What happened, in the past tense, standing on its own: “Re-index failed for Billing FAQ”. */
  title: string
  /** The cause or the figures: “812 of 1,204 documents · embedding quota reached”. */
  description?: React.ReactNode
  tone?: NotificationTone
  /** When, as the person should read it: “4 min ago”, “Yesterday 16:20”. */
  time: string
  /** The same moment as a machine-readable date, for the `<time>` element. */
  dateTime?: string
  /** Whether the operator has read it; unread by default. */
  read?: boolean
  /** One follow-up, as on a toast: “View run”. Running it also marks the item read. */
  action?: { label: string; onClick: () => void }
}

const MARK: Record<NotificationTone, string> = {
  neutral: 'bg-ink',
  success: 'bg-success',
  danger: 'bg-danger',
  warn: 'bg-warn cut-thin',
  info: 'bg-info',
}

const SR_TONE: Record<NotificationTone, 'success' | 'warn' | 'danger' | null> = {
  neutral: null,
  info: null,
  success: 'success',
  warn: 'warn',
  danger: 'danger',
}

export interface NotificationListProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Newest first. */
  notifications: NotificationItem[]
  /** Called with an item's id when its action runs. */
  onMarkRead?: (id: string) => void
  /** Shown when there is nothing. Defaults to “No notifications yet.” (`messages.empty`) */
  empty?: React.ReactNode
  /** The list's accessible name, “Notifications” (`messages.label`) by default. */
  label?: string
  /** Words for translation: the defaults above, the unread and tone words, Mark all as read and the bell's name. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<NotificationsMessages>
}

/**
 * The list on its own, for a full notifications page or a panel the page
 * places itself. `NotificationCentre` puts it in a popover under a bell.
 * `className`, `ref` and the rest go to the wrapping `<div>`.
 */
export function NotificationList({
  notifications,
  onMarkRead,
  empty,
  label,
  messages,
  className,
  ...props
}: NotificationListProps) {
  const [t] = useMessages('notifications', notificationsMessages, messages)
  return (
    <div {...props} data-slot="notification-list" className={cn('min-w-0', className)}>
      {notifications.length === 0 ? (
        <p className="m-0 px-4 py-8 text-center text-sm text-ink-2">
          {empty ?? t.empty}
        </p>
      ) : (
        <ul aria-label={label ?? t.label} className="m-0 list-none p-0">
          {notifications.map((item) => {
            const tone = item.tone ?? 'neutral'
            const unread = !item.read
            return (
              <li
                key={item.id}
                data-part="item"
                data-read={item.read || undefined}
                className={cn('flex gap-3 py-3 pe-4 ps-4 rule-b-soft', unread && 'bar-start-ink')}
              >
                <span aria-hidden data-part="tone" className={cn('mt-[5px] size-2.5 shrink-0', MARK[tone])} />
                <div className="min-w-0 flex-1">
                  <p data-part="title" className={cn('m-0 text-sm leading-snug text-ink', unread ? 'font-semibold' : 'font-normal')}>
                    {unread ? (
                      <span className="sr-only">
                        {t.unread}{' '}
                      </span>
                    ) : null}
                    {SR_TONE[tone] ? (
                      <span className="sr-only">
                        {t[SR_TONE[tone]]}{' '}
                      </span>
                    ) : null}
                    {item.title}
                  </p>
                  {item.description ? <div className="mt-0.5 text-sm text-ink-2">{item.description}</div> : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {unread ? (
                      <span aria-hidden data-part="unread" className="etiqueta text-xs text-ink">
                        {t.new}
                      </span>
                    ) : null}
                    <time data-part="time" dateTime={item.dateTime} className="text-xs tabular-nums text-ink-muted">
                      {item.time}
                    </time>
                    {item.action ? (
                      <Button
                        data-part="action"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          item.action!.onClick()
                          if (unread) onMarkRead?.(item.id)
                        }}
                      >
                        {item.action.label}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export interface NotificationCentreProps extends Omit<NotificationListProps, 'label'> {
  /** Whether the popover is open, when the page owns that. */
  open?: boolean
  /** Open on first render. */
  defaultOpen?: boolean
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Called when the operator presses Mark all as read. The button shows only while something is unread. */
  onMarkAllRead?: () => void
  /** Under the list: usually a link to a full notifications page, “View all”. */
  footer?: React.ReactNode
  /** The popover's title and the bell's name, “Notifications” (`messages.label`) by default. */
  label?: string
}

/** Above this the badge says 99+: a count nobody can act on, and wider than the bell. */
const MAX_COUNT = 99

/**
 * The bell for the top bar's `end`, and the list in a popover under it.
 * `className`, `ref` and the rest go to the popover popup.
 */
export function NotificationCentre({
  notifications,
  onMarkRead,
  onMarkAllRead,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  footer,
  empty,
  label: labelProp,
  messages,
  className,
  ref,
  ...props
}: NotificationCentreProps) {
  const [t, f] = useMessages('notifications', notificationsMessages, messages)
  const label = labelProp ?? t.label
  const [open, setOpen] = useControllable({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange })
  const popupRef = React.useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRefs(ref, popupRef)
  const unread = notifications.filter((n) => !n.read).length
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <PopoverPrimitive.Trigger
        render={
          <IconButton
            variant="ghost"
            size="sm"
            label={unread ? f.plural(t.bellUnread, unread, { label }) : label}
            data-slot="notification-centre-trigger"
            className="relative"
          >
            <Bell />
            {unread ? (
              <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center bg-ink px-1 font-ui text-2xs font-semibold leading-none text-on-ink tabular-nums">
                {unread > MAX_COUNT ? f.format(t.overflow, { max: MAX_COUNT }) : unread}
              </span>
            ) : null}
          </IconButton>
        }
      />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={16} className="z-(--z-popover)">
          {/* Focus lands on the popup, which is named by its title, rather than
              on the first button: Base UI's default was Mark all as read, one
              Enter away from clearing everything the operator came to read. */}
          <PopoverPrimitive.Popup
            {...props}
            ref={mergedRef}
            initialFocus={popupRef}
            data-slot="notification-centre"
            className={cn(floatingSurface, 'flex max-h-[min(32rem,calc(100dvh-5rem))] w-[24rem] max-w-[calc(100vw-2rem)] flex-col', className)}
          >
            <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 py-1.5 pe-2 ps-4 cut-b">
              <PopoverPrimitive.Title className="m-0 font-ui text-sm font-semibold">{label}</PopoverPrimitive.Title>
              {unread && onMarkAllRead ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // The button goes once nothing is unread. Focus would fall to
                    // <body> and out of the popover; the popup keeps it instead.
                    popupRef.current?.focus()
                    onMarkAllRead()
                  }}
                >
                  {t.markAllRead}
                </Button>
              ) : null}
            </div>
            <NotificationList
              notifications={notifications}
              onMarkRead={onMarkRead}
              empty={empty}
              label={label}
              messages={messages}
              className="scroll-cloth min-h-0 flex-1 overflow-y-auto"
            />
            {footer ? <div className="shrink-0 px-4 py-2.5 text-sm rule-t">{footer}</div> : null}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
