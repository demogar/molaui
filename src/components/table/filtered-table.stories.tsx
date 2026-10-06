import type { Meta, StoryObj } from '@storybook/react-vite'
import { Ban, Download, ExternalLink, Play, RefreshCw, RotateCcw } from 'lucide-react'
import * as React from 'react'

import { CayucoSidebar, CayucoTopbar } from '../app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../app-shell/app-shell'
import { PageHeader } from '../app-shell/page-header'
import { Badge, type BadgeTone } from '../badge'
import { Button } from '../button'
import { Combobox } from '../combobox'
import { DateRangePicker, type DateRange, type DateRangePreset } from '../date-picker'
import { DescriptionList } from '../description-list'
import { Drawer, DrawerContent } from '../drawer'
import { Field, SearchInput } from '../field'
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle, ToolbarToggleGroup } from '../toolbar'
import { type AgentRun, FIXTURE_NOW, formatDuration, formatRelative, makeAgentRuns, type RunStatus } from './agent-runs.fixture'
import { DataTable, type DataTableColumn } from './data-table'

const meta = {
  title: 'Components/Data display/Filtered table',
  component: DataTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '900px' },
      description: {
        component:
          'A whole Cayuco admin screen, composed from the system with nothing written for it: the app shell, a search field, an agent `Combobox`, a `DateRangePicker` with presets, a `Toolbar` of status toggles, and a `DataTable` with selection, a bulk-action bar, a Columns menu and pages. Choosing a run opens it in a `Drawer`.\n\n**Decisions.** The filters sit on one cut panel with the status toolbar, because they are one question asked of the data; the table’s own bar under it only ever describes the answer (how many runs, or what is selected). Every filter has a visible label — a placeholder is a hint and disappears as soon as someone types. The status toggles carry their counts, computed under the other filters, so “Failed 4” is what clicking it will show. A filter that matches nothing gives the *no results* empty state with **Clear filters**; it never says “create your first run”. Changing a filter clears the selection, and cancelling selected runs changes the data in place and clears it too, so the bar never offers an action on rows that are hidden or no longer qualify.',
      },
    },
  },
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

/* ── data ──────────────────────────────────────────────────────────── */

const TODAY = new Date(FIXTURE_NOW.getFullYear(), FIXTURE_NOW.getMonth(), FIXTURE_NOW.getDate())
const day = (offset: number) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset)
const LAST_7_DAYS = { start: day(-6), end: TODAY }

const PRESETS: DateRangePreset[] = [
  { label: 'Today', range: () => ({ start: TODAY, end: TODAY }) },
  { label: 'Yesterday', range: () => ({ start: day(-1), end: day(-1) }) },
  { label: 'Last 7 days', range: () => LAST_7_DAYS },
  { label: 'Last 30 days', range: () => ({ start: day(-29), end: TODAY }) },
]

const ALL_RUNS = makeAgentRuns(160, 21)
const AGENTS = [...new Set(ALL_RUNS.map((run) => run.agent))].sort().map((agent) => ({ value: agent, label: agent }))

type StatusFilter = 'all' | RunStatus
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_TONE: Record<RunStatus, BadgeTone> = {
  succeeded: 'success',
  running: 'info',
  failed: 'danger',
  queued: 'neutral',
  cancelled: 'warn',
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })
const integer = new Intl.NumberFormat('en-US')
const timestamp = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot pulse={status === 'running'}>
      {status}
    </Badge>
  )
}

function inRange(date: Date, range: DateRange) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return (!range.start || d >= range.start) && (!range.end || d <= range.end)
}

/* ── the screen ────────────────────────────────────────────────────── */

function RunsScreen() {
  const [runs, setRuns] = React.useState<AgentRun[]>(ALL_RUNS)
  const [query, setQuery] = React.useState('')
  const [agent, setAgent] = React.useState<string | null>(null)
  const [range, setRange] = React.useState<DateRange>(LAST_7_DAYS)
  const [status, setStatus] = React.useState<StatusFilter>('all')
  const [selection, setSelection] = React.useState<Set<string>>(new Set())
  const [page, setPage] = React.useState(1)
  const [refreshing, setRefreshing] = React.useState(false)
  // The run stays set after the drawer closes, so its contents do not vanish
  // mid-way through the exit slide.
  const [openRun, setOpenRun] = React.useState<AgentRun | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Everything but the status filter, so each toggle can say how many runs it would show.
  const scoped = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return runs.filter(
      (run) =>
        (!q || run.id.includes(q) || run.agent.toLowerCase().includes(q)) &&
        (!agent || run.agent === agent) &&
        inRange(run.startedAt, range),
    )
  }, [runs, query, agent, range])

  const counts = React.useMemo(() => {
    const c: Record<StatusFilter, number> = { all: scoped.length, failed: 0, running: 0, queued: 0, succeeded: 0, cancelled: 0 }
    for (const run of scoped) c[run.status] += 1
    return c
  }, [scoped])

  const visible = status === 'all' ? scoped : scoped.filter((run) => run.status === status)
  const filtered = query !== '' || agent !== null || status !== 'all' || range !== LAST_7_DAYS

  // A filter change re-asks the question: the answer starts at page 1, and
  // the selection goes, so a bulk action never lands on rows the filter now
  // hides.
  const refilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value)
    setPage(1)
    setSelection(new Set())
  }

  const clearFilters = () => {
    setQuery('')
    setAgent(null)
    setRange(LAST_7_DAYS)
    setStatus('all')
    setPage(1)
    setSelection(new Set())
  }

  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 700)
  }

  const cancelRuns = (ids: Set<string>, clear: () => void) => {
    setRuns((all) =>
      all.map((run) =>
        ids.has(run.id) && (run.status === 'running' || run.status === 'queued') ? { ...run, status: 'cancelled' } : run,
      ),
    )
    clear()
  }

  const columns: DataTableColumn<AgentRun>[] = [
    {
      key: 'id',
      header: 'Run',
      width: '9.5rem',
      hideable: false,
      cell: (run) => (
        <button
          type="button"
          onClick={() => {
            setOpenRun(run)
            setDrawerOpen(true)
          }}
          className="literal cursor-pointer text-ink underline decoration-keyline underline-offset-4 transition-colors duration-(--motion-cut) hover:decoration-ink"
        >
          {run.id}
        </button>
      ),
    },
    { key: 'agent', header: 'Agent', sortable: true, truncate: true, cell: (run) => <span className="font-medium">{run.agent}</span> },
    { key: 'status', header: 'Status', sortable: true, width: '8.5rem', cell: (run) => <RunStatusBadge status={run.status} /> },
    { key: 'model', header: 'Model', width: '10rem', cell: (run) => <span className="literal text-ink-2">{run.model}</span> },
    {
      key: 'tokens',
      header: 'Tokens',
      sortable: true,
      align: 'end',
      width: '6.5rem',
      cell: (run) => (run.status === 'queued' ? '—' : integer.format(run.tokens)),
    },
    {
      key: 'cost',
      header: 'Cost',
      sortable: true,
      align: 'end',
      width: '6.5rem',
      cell: (run) => (run.status === 'queued' ? '—' : currency.format(run.cost)),
    },
    { key: 'duration', header: 'Duration', sortable: true, align: 'end', width: '6.5rem', cell: (run) => formatDuration(run.duration) },
    {
      key: 'startedAt',
      header: 'Started',
      sortable: true,
      align: 'end',
      width: '6.5rem',
      cell: (run) => (
        <time dateTime={run.startedAt.toISOString()} title={run.startedAt.toUTCString()} className="text-ink-muted">
          {formatRelative(run.startedAt)}
        </time>
      ),
    },
  ]

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
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <section aria-label="Filter runs" className="bg-cloth-pale shadow-cut">
          <div role="search" aria-label="Runs" className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_14rem_17rem]">
            <Field label="Search">
              {(control) => (
                <SearchInput
                  {...control}
                  size="sm"
                  placeholder="Run id or agent"
                  value={query}
                  onChange={(event) => refilter(setQuery)(event.target.value)}
                />
              )}
            </Field>
            <Field label="Agent">
              {(control) => (
                <Combobox
                  {...control}
                  size="sm"
                  items={AGENTS}
                  placeholder="Any agent"
                  value={agent}
                  onValueChange={refilter(setAgent)}
                />
              )}
            </Field>
            <Field label="Started">
              {(control) => (
                <DateRangePicker
                  {...control}
                  size="sm"
                  today={TODAY}
                  max={TODAY}
                  presets={PRESETS}
                  value={range}
                  onValueChange={refilter(setRange)}
                />
              )}
            </Field>
          </div>
          <Toolbar aria-label="Run status" className="flex-nowrap overflow-x-auto px-2 py-1.5 shadow-[inset_0_1px_0_var(--keyline)] scroll-cloth">
            <ToolbarToggleGroup
              aria-label="Status"
              value={[status]}
              onValueChange={(next) => {
                // One-of with no "none": pressing the pressed toggle keeps it.
                const value = next[0] as StatusFilter | undefined
                if (value) refilter(setStatus)(value)
              }}
            >
              {STATUS_FILTERS.map((filter) => (
                <ToolbarToggle key={filter.value} value={filter.value} className="shrink-0">
                  {filter.label}
                  <span className="font-normal tabular-nums text-ink-muted group-data-pressed/button:text-on-ink-muted">
                    {integer.format(counts[filter.value])}
                  </span>
                </ToolbarToggle>
              ))}
            </ToolbarToggleGroup>
            <ToolbarSeparator />
            <ToolbarButton icon={<RotateCcw />} disabled={!filtered} onClick={clearFilters} className="shrink-0">
              Clear filters
            </ToolbarButton>
            <ToolbarButton
              icon={<RefreshCw />}
              aria-label="Refresh runs"
              onClick={refresh}
              className="ms-auto w-(--control-h-sm) shrink-0 px-0"
            />
          </Toolbar>
        </section>

        <DataTable
          label="Agent runs"
          noun={{ one: 'run', other: 'runs' }}
          columns={columns}
          rows={visible}
          getRowId={(run) => run.id}
          rowLabel={(run) => `Select ${run.id}`}
          loading={refreshing}
          defaultSort={{ key: 'startedAt', direction: 'descending' }}
          pageSize={12}
          paginationVariant="pages"
          page={page}
          onPageChange={setPage}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          bulkActions={({ selection: ids, clear }) => {
            const cancellable = runs.filter((run) => ids.has(run.id) && (run.status === 'running' || run.status === 'queued')).length
            return (
              <>
                <Button size="sm" variant="secondary" icon={<Play />} className="max-sm:hidden">
                  Re-run
                </Button>
                <Button size="sm" variant="secondary" icon={<Download />} className="max-sm:hidden">
                  Export
                </Button>
                <Button size="sm" variant="danger" icon={<Ban />} disabled={cancellable === 0} onClick={() => cancelRuns(ids, clear)}>
                  {cancellable > 0 ? `Cancel ${cancellable}` : 'Cancel'}
                </Button>
              </>
            )
          }}
          columnMenu
          defaultHiddenColumns={['duration']}
          framed
          className="min-w-[52rem]"
          empty={{
            variant: 'no-results',
            title: 'No runs match these filters',
            description: 'Try another agent, a wider date range, or clear the filters to see every run.',
            actions: (
              <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={clearFilters}>
                Clear filters
              </Button>
            ),
          }}
        />
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        {openRun ? (
          <DrawerContent
            title={openRun.agent}
            description={`Started ${formatRelative(openRun.startedAt)} on ${openRun.model}.`}
            band={openRun.status === 'failed' ? 'rojo' : 'oro'}
            footer={
              <>
                <Button variant="ghost" icon={<ExternalLink />}>
                  Open trace
                </Button>
                <Button icon={<Play />}>Re-run</Button>
              </>
            }
          >
            <DescriptionList
              layout="stacked"
              items={[
                { term: 'Status', detail: <RunStatusBadge status={openRun.status} /> },
                { term: 'Run', detail: openRun.id, literal: true },
                { term: 'Model', detail: openRun.model, literal: true },
                { term: 'Tokens', detail: openRun.status === 'queued' ? '—' : integer.format(openRun.tokens) },
                { term: 'Cost', detail: openRun.status === 'queued' ? '—' : currency.format(openRun.cost) },
                { term: 'Duration', detail: formatDuration(openRun.duration) },
                { term: 'Started', detail: `${timestamp.format(openRun.startedAt)} UTC` },
              ]}
            />
          </DrawerContent>
        ) : null}
      </Drawer>
    </>
  )
}

export const Runs: Story = {
  name: 'Runs admin screen',
  args: { columns: [], rows: [], getRowId: () => '' },
  render: () => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar />}>
      <RunsScreen />
    </AppShell>
  ),
}
