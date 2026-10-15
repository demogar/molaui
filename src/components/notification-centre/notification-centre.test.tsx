import { render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NotificationCentre, type NotificationItem, NotificationList } from './notification-centre'

const items = (): NotificationItem[] => [
  { id: 'a', tone: 'danger', title: 'Re-index failed for Billing FAQ', time: '4 min ago', action: { label: 'View run', onClick: vi.fn() } },
  { id: 'b', tone: 'warn', title: 'Refund agent is waiting for approval', time: '18 min ago' },
  { id: 'c', tone: 'success', title: 'Evaluation passed', time: '1 h ago', read: true },
]

function Centre({ initial = items() }: { initial?: NotificationItem[] }) {
  const [list, setList] = React.useState(initial)
  return (
    <NotificationCentre
      notifications={list}
      onMarkRead={(id) => setList((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)))}
      onMarkAllRead={() => setList((all) => all.map((n) => ({ ...n, read: true })))}
    />
  )
}

describe('NotificationCentre', () => {
  it('names the bell with the unread count, and with none once all are read', () => {
    const { rerender } = render(<NotificationCentre notifications={items()} />)
    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
    rerender(<NotificationCentre notifications={items().map((n) => ({ ...n, read: true }))} />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('has no live region: the count changes silently, because the toast already spoke', async () => {
    const { rerender } = render(<NotificationCentre notifications={items()} defaultOpen />)
    await screen.findByRole('dialog', { name: 'Notifications' })
    rerender(<NotificationCentre notifications={[{ id: 'z', title: 'Deploy failed', time: 'Just now' }, ...items()]} defaultOpen />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(document.querySelector('[aria-live]:not([aria-live="off"])')).toBeNull()
  })

  it('opens from the bell with Enter or Space, and Escape returns focus to it', async () => {
    const user = userEvent.setup()
    render(<Centre />)
    const bell = screen.getByRole('button', { name: 'Notifications, 2 unread' })
    await user.tab()
    expect(bell).toHaveFocus()
    await user.keyboard('{Enter}')
    const popup = await screen.findByRole('dialog', { name: 'Notifications' })
    // On the popup, named by its title; not on Mark all as read, one Enter from clearing the list.
    await waitFor(() => expect(popup).toHaveFocus())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(bell).toHaveFocus())
    await user.keyboard(' ')
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('reads each unread item as unread with its tone, and moves through the actions with Tab and Shift+Tab', async () => {
    const user = userEvent.setup()
    render(<Centre />)
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    const popup = await screen.findByRole('dialog', { name: 'Notifications' })
    const list = within(popup).getByRole('list', { name: 'Notifications' })
    const [first, , third] = within(list).getAllByRole('listitem')
    expect(first).toHaveTextContent(/^Unread\. Error: Re-index failed for Billing FAQ/)
    expect(first).toHaveTextContent('New')
    expect(third).not.toHaveTextContent('Unread')
    const markAll = within(popup).getByRole('button', { name: 'Mark all as read' })
    const view = within(popup).getByRole('button', { name: 'View run' })
    markAll.focus()
    await user.tab()
    expect(view).toHaveFocus()
    await user.tab({ shift: true })
    expect(markAll).toHaveFocus()
  })

  it('marks an item read when its action runs', async () => {
    const user = userEvent.setup()
    render(<Centre />)
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    await user.click(await screen.findByRole('button', { name: 'View run' }))
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
  })

  it('keeps focus in the popover when Mark all as read goes away', async () => {
    const user = userEvent.setup()
    render(<Centre />)
    await user.click(screen.getByRole('button', { name: /Notifications/ }))
    const popup = await screen.findByRole('dialog', { name: 'Notifications' })
    await user.click(within(popup).getByRole('button', { name: 'Mark all as read' }))
    expect(within(popup).queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument()
    expect(popup).toContainElement(document.activeElement as HTMLElement)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })
})

describe('NotificationList', () => {
  it('says so when there is nothing', () => {
    render(<NotificationList notifications={[]} />)
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
