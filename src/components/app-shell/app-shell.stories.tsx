import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleHelp, Download, LifeBuoy, ListTree, Play, RefreshCw, SlidersHorizontal } from 'lucide-react'
import * as React from 'react'

import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Banner } from '../banner'
import { Button, IconButton } from '../button'
import { type CommandGroup, CommandPalette, useCommandShortcut } from '../command'
import { NotificationCentre } from '../notification-centre'
import { cayucoNotifications } from '../notification-centre/_story-data/notifications'
import { HotkeysProvider, ShortcutsDialog, useHotkeyKeys, useHotkeyPlatform, useHotkeys } from '../shortcuts'
import { ToastProvider, useToast } from '../toast'
import { Stat, StatGroup } from '../stat'
import { DataTable, type DataTableColumn } from '../table'
import { type AgentRun, formatDuration, formatRelative, makeAgentRuns } from '../table/agent-runs.fixture'
import { CayucoSidebar, CayucoTopbar } from './_story-data/cayuco-chrome'
import { AppShell } from './app-shell'
import { PageHeader } from './page-header'
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from '../toolbar'

const meta = {
  title: 'Components/Layout/App shell',
  tags: ['stable'],
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '760px' },
      description: {
        component:
          'The frame an internal tool lives in. Exactly the viewport tall, and only `<main>` scrolls — so the switcher, search and way back are never twenty rows away. From 920px the sidebar is in the layout and collapses to an icon rail; below it, the **same tree** renders in a modal sheet, so desktop and mobile navigation cannot drift apart. The demo is *Cayuco* — a fictional agent platform for support, docs and billing teams, named for the dugout canoe of the Panamanian isthmus.',
      },
    },
  },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

const runs = makeAgentRuns(40)
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })
const integer = new Intl.NumberFormat('en-US')

const TONE = { succeeded: 'success', running: 'info', failed: 'danger', queued: 'neutral', cancelled: 'neutral' } as const

const columns: DataTableColumn<AgentRun>[] = [
  { key: 'id', header: 'Run', width: '9.5rem', cell: (r) => <span className="literal text-ink-2">{r.id}</span> },
  { key: 'agent', header: 'Agent', sortable: true, truncate: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '8.5rem',
    cell: (r) => (
      <Badge tone={TONE[r.status]} dot pulse={r.status === 'running'}>
        {r.status}
      </Badge>
    ),
  },
  { key: 'tokens', header: 'Tokens', sortable: true, align: 'end', width: '6.5rem', cell: (r) => (r.status === 'queued' ? '—' : integer.format(r.tokens)) },
  { key: 'cost', header: 'Cost', sortable: true, align: 'end', width: '6.5rem', cell: (r) => (r.status === 'queued' ? '—' : currency.format(r.cost)) },
  { key: 'duration', header: 'Duration', sortable: true, align: 'end', width: '6.5rem', cell: (r) => formatDuration(r.duration) },
  {
    key: 'startedAt',
    header: 'Started',
    sortable: true,
    align: 'end',
    width: '6.5rem',
    cell: (r) => (
      <time dateTime={r.startedAt.toISOString()} className="text-ink-muted">
        {formatRelative(r.startedAt)}
      </time>
    ),
  },
]

function RunsPage() {
  return (
    <>
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
            <a href="#support" className="text-ink-2 underline decoration-keyline hover:text-ink">
              Support
            </a>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span aria-current="page">Runs</span>
          </nav>
        }
        title="Runs"
        description="Every agent run in the Support workspace. Failed runs keep their full trace for 30 days."
        actions={
          <>
            <Button variant="secondary" icon={<Download />}>
              Export
            </Button>
            <Button icon={<Play />}>New run</Button>
          </>
        }
        meta={[
          <Badge key="live" tone="info" dot pulse>
            Live
          </Badge>,
          <span key="updated">Updated 12s ago</span>,
          <span key="retention">Retention 30 days</span>,
        ]}
      />
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <StatGroup columns={4}>
          <Stat
            label="Runs today"
            value="1,204"
            delta={{ value: '12%', direction: 'up', sentiment: 'positive', period: 'vs yesterday' }}
            trend={[820, 910, 870, 1010, 980, 1090, 1204]}
          />
          <Stat
            label="Success rate"
            value="97.8"
            unit="%"
            delta={{ value: '0.4 pt', direction: 'down', sentiment: 'negative', period: 'vs yesterday' }}
            trend={[98.6, 98.4, 98.9, 98.1, 98.3, 98.2, 97.8]}
          />
          <Stat
            label="p95 duration"
            value="4m 12s"
            delta={{ value: '38s', direction: 'down', sentiment: 'positive', period: 'vs yesterday' }}
            trend={[310, 290, 305, 280, 276, 268, 252]}
          />
          <Stat label="Spend today" value="$142.08" hint="Budget $400 / day" />
        </StatGroup>

        <div className="flex flex-col gap-2">
          <Toolbar aria-label="Filter runs" variant="panel">
            <ToolbarGroup>
              <ToolbarButton icon={<SlidersHorizontal />}>Status: any</ToolbarButton>
              <ToolbarButton>Agent: any</ToolbarButton>
              <ToolbarButton>Model: any</ToolbarButton>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <ToolbarButton>Last 24 hours</ToolbarButton>
            </ToolbarGroup>
            <ToolbarButton icon={<RefreshCw />} aria-label="Refresh" className="ms-auto" />
          </Toolbar>
          <DataTable
            label="Agent runs"
            columns={columns}
            rows={runs}
            getRowId={(r) => r.id}
            rowLabel={(r) => `Select ${r.id}`}
            selectable
            defaultSort={{ key: 'startedAt', direction: 'descending' }}
            framed
            className="min-w-[48rem]"
          />
        </div>
      </div>
    </>
  )
}

export const Cayuco: Story = {
  args: { topbar: null, sidebar: null, children: null },
  render: () => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar />}>
      <RunsPage />
    </AppShell>
  ),
}

export const CollapsedRail: Story = {
  args: { topbar: null, sidebar: null, children: null },
  render: () => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar />} defaultSidebarCollapsed>
      <RunsPage />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Collapsed to a 56px rail. Labels become screen-reader text and native tooltips; section titles become short keylines; the failure count survives as a cut mark on the icon, so it is still visible from the rail.',
      },
    },
  },
}

export const Mobile: Story = {
  args: { topbar: null, sidebar: null, children: null },
  render: () => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar />}>
      <RunsPage />
    </AppShell>
  ),
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  parameters: {
    docs: {
      description: {
        story: 'Under 920px the rail is gone and the menu button opens the same sidebar as a sheet. Choosing a destination closes it.',
      },
    },
  },
}

const paletteGroups: CommandGroup[] = [
  {
    heading: 'Go to',
    items: [
      { id: 'runs', label: 'Runs', icon: <ListTree />, hotkey: 'g r', onSelect: () => {} },
      { id: 'escalations', label: 'Escalations', icon: <LifeBuoy />, hotkey: 'g e', onSelect: () => {} },
    ],
  },
]

function NoticesShell() {
  const toast = useToast()
  const [palette, setPalette] = React.useState(false)
  const [items, setItems] = React.useState(() => cayucoNotifications())
  const [maintenance, setMaintenance] = React.useState(true)
  useCommandShortcut(() => setPalette((o) => !o))
  const keys = useHotkeyKeys('mod+k')
  // ⌘K reads as one glyph pair; Ctrl+K needs the plus to be read as a chord.
  const shortcut = keys.join(useHotkeyPlatform() === 'apple' ? '' : '+')
  useHotkeys(
    'shift+f',
    () => {
      const title = 'Re-index failed for Refund policy'
      toast.danger({ title, description: 'Source returned 503 · retrying in 30s' })
      setItems((all) => [{ id: `n${all.length + 1}`, tone: 'danger', title, time: 'Just now' }, ...all])
    },
    { label: 'Simulate a failed re-index', group: 'Demo' },
  )
  return (
    <AppShell
      banner={
        maintenance ? (
          <Banner tone="warn" title="Scheduled maintenance" onDismiss={() => setMaintenance(false)}>
            Saturday 18 October, 02:00–03:00 UTC. Runs started then wait in the queue.
          </Banner>
        ) : null
      }
      topbar={
        <CayucoTopbar
          search={{ shortcut, onClick: () => setPalette(true) }}
          end={
            <>
              <ShortcutsDialog
                trigger={
                  <IconButton label="Keyboard shortcuts" variant="ghost" size="sm" className="max-sm:hidden">
                    <CircleHelp />
                  </IconButton>
                }
              />
              <NotificationCentre
                notifications={items}
                onMarkRead={(id) => setItems((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)))}
                onMarkAllRead={() => setItems((all) => all.map((n) => ({ ...n, read: true })))}
              />
              <Avatar name="Ana Pérez" size="sm" className="ms-1" />
            </>
          }
        />
      }
      sidebar={<CayucoSidebar />}
    >
      <CommandPalette open={palette} onOpenChange={setPalette} groups={paletteGroups} />
      <RunsPage />
    </AppShell>
  )
}

export const WithNotices: Story = {
  args: { topbar: null, sidebar: null, children: null },
  render: () => (
    <HotkeysProvider>
      <ToastProvider>
        <NoticesShell />
      </ToastProvider>
    </HotkeysProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The shell’s three kinds of notice, each in its place. The **banner** is a condition of the whole app, above the top bar. A **toast** is an event, said once (press ⇧F to fail a re-index). The **notification centre** under the bell keeps that event after the toast has gone, and its count changes without a word. The `?` key, or the help button, lists every shortcut bound on the page from one registry: the palette’s ⌘K or Ctrl-K, its commands’ G sequences, the toast region’s F6, and the page’s own.',
      },
    },
  },
}
