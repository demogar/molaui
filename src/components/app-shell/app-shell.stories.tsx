import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Bell,
  BookOpen,
  Bot,
  ChevronsUpDown,
  CircleHelp,
  Download,
  FlaskConical,
  LayoutDashboard,
  ListTree,
  Play,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'

import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Button, IconButton } from '../button'
import { Stat, StatGroup } from '../stat'
import { DataTable, type DataTableColumn } from '../table'
import { type AgentRun, formatDuration, formatRelative, makeAgentRuns } from '../table/agent-runs.fixture'
import { Kbd } from '../typography'
import { AppShell, Topbar } from './app-shell'
import { PageHeader } from './page-header'
import { NavItem, NavSection, Sidebar } from './sidebar'
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from '../toolbar'

const meta = {
  title: 'Components/Layout/App shell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '760px' },
      description: {
        component:
          'The frame an internal tool lives in. Exactly the viewport tall, and only `<main>` scrolls — so the switcher, search and way back are never twenty rows away. From 920px the sidebar is in the layout and collapses to an icon rail; below it, the **same tree** renders in a modal sheet, so desktop and mobile navigation cannot drift apart. The demo is *Cayuco* — a fictional growth and agent platform, named for the dugout canoe of the Panamanian isthmus.',
      },
    },
  },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

/** A cut-square mark: ink, gold band, ink, verde heart. */
function CayucoMark() {
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

function CayucoTopbar() {
  return (
    <Topbar
      start={
        <>
          <a href="#overview" className="flex items-center gap-2 px-1 text-ink no-underline">
            <CayucoMark />
            <span className="font-display text-base font-bold tracking-display wdth-display">Cayuco</span>
          </a>
          <Button variant="ghost" size="sm" className="max-sm:hidden" aria-label="Switch workspace, current: Growth">
            Growth
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

function CayucoSidebar({ active = 'Runs' }: { active?: string }) {
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
      <NavSection title="Growth">
        {item('Experiments', <FlaskConical />, { count: 7, countLabel: 'running' })}
      </NavSection>
    </Sidebar>
  )
}

const runs = makeAgentRuns(40)
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })
const integer = new Intl.NumberFormat('en-US')

const TONE = { succeeded: 'success', running: 'info', failed: 'danger', queued: 'neutral', cancelled: 'warn' } as const

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
            <a href="#growth" className="text-ink-2 underline decoration-keyline hover:text-ink">
              Growth
            </a>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span aria-current="page">Runs</span>
          </nav>
        }
        title="Runs"
        description="Every agent run in the Growth workspace. Failed runs keep their full trace for 30 days."
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
