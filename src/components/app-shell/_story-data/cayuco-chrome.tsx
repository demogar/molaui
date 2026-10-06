/**
 * STORY-ONLY. The Cayuco top bar and sidebar, shared by every story that
 * shows a whole screen, so the app shell and the filtered-table showcase are
 * the same product rather than two drawings of it. Not exported from the
 * package.
 */
import { Bell, BookOpen, Bot, ChevronsUpDown, CircleHelp, LayoutDashboard, LifeBuoy, ListTree, Search, Settings } from 'lucide-react'
import type * as React from 'react'

import { Avatar } from '../../avatar'
import { Button, IconButton } from '../../button'
import { Kbd } from '../../typography'
import { Topbar } from '../app-shell'
import { NavItem, NavSection, Sidebar } from '../sidebar'

/** A cut-square mark: ink, gold band, ink, verde heart. */
export function CayucoMark() {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
      <rect width="22" height="22" fill="var(--ink)" />
      <rect x="3" y="3" width="16" height="16" fill="var(--oro)" />
      <rect x="5" y="5" width="12" height="12" fill="var(--ink)" />
      <rect x="8" y="8" width="6" height="6" fill="var(--verde)" />
    </svg>
  )
}

function SearchTrigger() {
  return (
    <button
      type="button"
      className="flex h-(--control-h-sm) w-full max-w-md items-center gap-2 bg-cloth px-2.5 text-sm text-ink-muted shadow-cut transition-shadow duration-(--motion-cut) hover:cut-band band-oro [--cut-reveal:3px]"
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="flex-1 truncate text-start">Search runs, agents, documents…</span>
      <Kbd className="max-sm:hidden">⌘K</Kbd>
    </button>
  )
}

export function CayucoTopbar() {
  return (
    <Topbar
      start={
        <>
          <a href="#overview" className="flex items-center gap-2 px-1 text-ink no-underline">
            <CayucoMark />
            <span className="font-display text-base font-bold tracking-display wdth-display">Cayuco</span>
          </a>
          <Button variant="ghost" size="sm" className="max-sm:hidden" aria-label="Switch workspace, current: Support">
            Support
            <ChevronsUpDown />
          </Button>
        </>
      }
      center={<SearchTrigger />}
      end={
        <>
          <IconButton label="Help" variant="ghost" size="sm" className="max-sm:hidden">
            <CircleHelp />
          </IconButton>
          <IconButton label="Notifications, 2 unread" variant="ghost" size="sm">
            <Bell />
          </IconButton>
          <Avatar name="Ana Pérez" size="sm" className="ms-1" />
        </>
      }
    />
  )
}

export function CayucoSidebar({ active = 'Runs' }: { active?: string }) {
  const item = (label: string, icon: React.ReactNode, extra?: Partial<React.ComponentProps<typeof NavItem>>) => (
    <NavItem href={`#${label.toLowerCase()}`} icon={icon} active={active === label} {...extra}>
      {label}
    </NavItem>
  )
  return (
    <Sidebar
      label="Main"
      footer={
        <ul className="m-0 list-none p-0">
          {item('Settings', <Settings />)}
        </ul>
      }
    >
      <NavSection title="Platform">
        {item('Overview', <LayoutDashboard />)}
        {item('Agents', <Bot />, { count: 8 })}
        {item('Runs', <ListTree />, { count: 3, countLabel: 'failed in the last hour', countTone: 'attention' })}
        {item('Knowledge', <BookOpen />)}
      </NavSection>
      <NavSection title="Support">
        {item('Escalations', <LifeBuoy />, { count: 7, countLabel: 'open' })}
      </NavSection>
    </Sidebar>
  )
}
