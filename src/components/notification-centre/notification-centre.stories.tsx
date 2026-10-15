import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { ToastProvider, useToast } from '../toast'
import { cayucoNotifications } from './_story-data/notifications'
import { NotificationCentre, type NotificationItem, NotificationList } from './notification-centre'

const meta = {
  title: 'Components/Feedback/Notification centre',
  tags: ['experimental'],
  component: NotificationCentre,
  args: { notifications: cayucoNotifications(), defaultOpen: true },
  parameters: {
    layout: 'padded',
    docs: {
      story: { inline: false, height: '560px' },
      description: {
        component:
          'Where a notification goes after its toast has gone. **The toast is the moment, the centre is the record**: the same event usually goes to both, the toast to say it now and the centre to find it later. The centre never says it now: no live region, and the unread count changes silently, because the toast already announced the event. The count is in the bell’s name, “Notifications, 2 unread”, heard when someone goes to the bell. Unread is an ink edge, a semibold title and the word New, never a tint alone. The list is a prop: the page owns where notifications come from and whether “read” is saved.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationCentre>

export default meta
type Story = StoryObj<typeof meta>

function Stateful({ initial, ...props }: { initial: NotificationItem[] } & Partial<React.ComponentProps<typeof NotificationCentre>>) {
  const [items, setItems] = React.useState(initial)
  return (
    <NotificationCentre
      {...props}
      notifications={items}
      onMarkRead={(id) => setItems((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)))}
      onMarkAllRead={() => setItems((all) => all.map((n) => ({ ...n, read: true })))}
      footer={
        <a href="#notifications" className="text-ink underline decoration-keyline hover:decoration-ink">
          View all notifications
        </a>
      }
    />
  )
}

export const Default: Story = {
  render: (args) => <Stateful initial={args.notifications} defaultOpen={args.defaultOpen} />,
}

export const Empty: Story = {
  args: { notifications: [] },
  parameters: {
    docs: { description: { story: 'Nothing yet: a sentence, not an illustration. The bell is named “Notifications” with no count, and there is no Mark all as read to press.' } },
  },
}

export const AllRead: Story = {
  args: { notifications: cayucoNotifications().map((n) => ({ ...n, read: true })), onMarkAllRead: fn() },
  parameters: {
    docs: {
      description: {
        story: 'Everything read: no badge on the bell, no edges, no New, and no Mark all as read. A disabled button would say the same thing in a fainter voice; the system states it instead.',
      },
    },
  },
}

export const List: Story = {
  render: (args) => (
    <div className="w-full max-w-xl bg-cloth-pale shadow-cut">
      <NotificationList notifications={args.notifications} onMarkRead={fn()} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '`NotificationList` on its own, for a full notifications page or a panel the page places itself. The popover above is this list under a bell.',
      },
    },
  },
}

let next = 0

function WithToastsDemo() {
  const toast = useToast()
  const [items, setItems] = React.useState<NotificationItem[]>(cayucoNotifications().slice(2))
  function fail() {
    next += 1
    const title = `Deploy failed for Returns triage v${4 + next}`
    const description = 'Tool “search_tickets” timed out after 30s'
    // One event, two places: the toast says it now, the centre keeps it.
    toast.danger({ title, description })
    setItems((all) => [{ id: `deploy-${next}`, tone: 'danger', title, description, time: 'Just now' }, ...all])
  }
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <Button variant="secondary" onClick={fail}>
        Fail a deploy
      </Button>
      <NotificationCentre
        notifications={items}
        onMarkRead={(id) => setItems((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)))}
        onMarkAllRead={() => setItems((all) => all.map((n) => ({ ...n, read: true })))}
      />
    </div>
  )
}

export const WithToasts: Story = {
  render: () => (
    <ToastProvider>
      <WithToastsDemo />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The relationship, working. Failing a deploy raises a toast, which is announced, and adds the same event to the centre, which is not: the bell’s name gains one unread, silently. Five seconds later the toast has gone and the record is still under the bell.',
      },
    },
  },
}
