import { Ban, Download, ExternalLink, Play, RefreshCw, RotateCcw } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '../../components/app-shell/page-header'
import { Badge, type BadgeTone } from '../../components/badge'
import { Button } from '../../components/button'
import { Callout } from '../../components/callout'
import { Combobox } from '../../components/combobox'
import { DateRangePicker, type DateRange, type DateRangePreset } from '../../components/date-picker'
import { DescriptionList } from '../../components/description-list'
import { Drawer, DrawerContent } from '../../components/drawer'
import { EmptyState } from '../../components/empty-state'
import { Field, SearchInput } from '../../components/field'
import { DataTable, type DataTableColumn } from '../../components/table'
import {
  type AgentRun,
  FIXTURE_NOW,
  formatDuration,
  formatRelative,
  makeAgentRuns,
  type RunStatus,
} from '../../components/table/agent-runs.fixture'
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarToggle,
  ToolbarToggleGroup,
} from '../../components/toolbar'


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
/** The fixture's runs, for stories that open with a selection. */
export const RUNS: readonly AgentRun[] = ALL_RUNS
const ADMINS = ['Ana Ruiz', 'Kai Morales']
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
  // A person stopped it: stated without alarm, as RunStatus does. Gold is
  // for work that is waiting on someone.
  cancelled: 'neutral',
}

/** The status word as a person reads it. The badge shows it as written, so it is written in sentence case here. */
const STATUS_LABEL: Record<RunStatus, string> = {
  succeeded: 'Succeeded',
  running: 'Running',
  failed: 'Failed',
  queued: 'Queued',
  cancelled: 'Cancelled',
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })
const integer = new Intl.NumberFormat('en-US')
const timestamp = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot pulse={status === 'running'}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export interface RunsAdminScreenProps {
  /** `loading` before the first rows arrive; `error` when they could not be loaded. */
  status?: 'ready' | 'loading' | 'error'
  /** Whether this person may start and cancel runs. A viewer can still select and export. */
  canManage?: boolean
  /** Open with this search already typed. */
  defaultQuery?: string
  /** Open with these run ids selected. */
  defaultSelection?: readonly string[]
  /** Retry after a failed load. */
  onRetry?: () => void
}

function inRange(date: Date, range: DateRange) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return (!range.start || d >= range.start) && (!range.end || d <= range.end)
}

/**
 * The runs admin screen: the page an operator opens when something is
 * failing and they need to find it among a few hundred runs.
 *
 * It is composed from the system with nothing written for it — the page
 * header, a search field, an agent `Combobox`, a `DateRangePicker` with
 * presets, a `Toolbar` of status toggles, a `DataTable` and a `Drawer` — and
 * it is kept as a pattern rather than a component because every product asks
 * a different question of its own table. What is reusable is the shape:
 *
 * - The filters share one cut panel with the status toolbar, because they are
 *   one question asked of the data. The table's own bar only ever describes
 *   the answer (how many runs, or what is selected).
 * - Every status toggle carries its count, computed under the OTHER filters,
 *   so "Failed 4" is what pressing it will show.
 * - A filter change re-asks the question: back to page 1, and the selection
 *   is cleared, so a bulk action never lands on rows the filter now hides.
 * - A run opens in a `Drawer`, not a new page, so the filtered list the
 *   operator built is still there when they close it.
 *
 * The states around the answer keep the question in place. Loading and a
 * failed load leave the filters where they are, because the operator's
 * question is still the right one; only the toggles' counts go, since a
 * count of runs that have not loaded is a wrong number, not a placeholder.
 * A failed load replaces the table with an error empty state and Retry,
 * because a table of zero rows would say "0 runs", which is a different
 * claim. Someone who may not start or cancel runs (a viewer) still selects
 * and exports: the bulk bar drops Cancel rather than offering one that
 * fails, the header drops New run, and a callout names who can.
 *
 * Renders the page content only; the story puts it inside the Cayuco app
 * shell, as a product would put it inside its own.
 */
export function RunsAdminScreen({
  status: loadStatus = 'ready',
  canManage = true,
  defaultQuery = '',
  defaultSelection = [],
  onRetry,
}: RunsAdminScreenProps) {
  const [runs, setRuns] = React.useState<AgentRun[]>(ALL_RUNS)
  const [query, setQuery] = React.useState(defaultQuery)
  const [agent, setAgent] = React.useState<string | null>(null)
  const [range, setRange] = React.useState<DateRange>(LAST_7_DAYS)
  const [status, setStatus] = React.useState<StatusFilter>('all')
  const [selection, setSelection] = React.useState<Set<string>>(() => new Set(defaultSelection))
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
          className="literal cursor-pointer text-ink underline decoration-keyline underline-offset-4 transition-colors hover:decoration-ink"
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
            {canManage ? <Button icon={<Play />}>New run</Button> : null}
          </>
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {canManage ? null : (
          <Callout tone="info" variant="flat" headingLevel={2} title="Only workspace admins can start or cancel runs">
            You can search, select and export. Ask {ADMINS.join(' or ')} if a run needs cancelling.
          </Callout>
        )}
        <section aria-label="Filter runs" className="bg-cloth-pale cut-frame">
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
          <Toolbar aria-label="Run status" className="px-2 py-1.5 rule-t">
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
                  {loadStatus === 'ready' ? (
                    <span className="font-normal tabular-nums text-ink-muted group-data-pressed/button:text-on-ink-muted">
                      {integer.format(counts[filter.value])}
                    </span>
                  ) : null}
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

        {loadStatus === 'error' ? (
          <EmptyState
            kind="error"
            size="lg"
            headingLevel={2}
            title="Runs didn’t load"
            description="The runs service didn’t answer within 10 seconds. Nothing has changed: running agents carry on, and your filters are kept."
            actions={
              <Button variant="secondary" icon={<RotateCcw />} onClick={onRetry}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            {/* The outline's level 2 for the answer. The no-results empty state
                inside the table is a level 3 heading, and with only the page's
                h1 above it the outline skipped a level. The visible bar already
                says how many runs there are, so the heading is for the outline
                alone. */}
            <h2 className="sr-only">Agent runs</h2>
            <DataTable
              label="Agent runs"
              noun={{ one: 'run', other: 'runs' }}
              columns={columns}
              rows={visible}
              getRowId={(run) => run.id}
              rowLabel={(run) => `Select ${run.id}`}
              loading={refreshing || loadStatus === 'loading'}
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
                    {canManage ? (
                      <Button size="sm" variant="danger" icon={<Ban />} disabled={cancellable === 0} onClick={() => cancelRuns(ids, clear)}>
                        {cancellable > 0 ? `Cancel ${cancellable}` : 'Cancel'}
                      </Button>
                    ) : null}
                  </>
                )
              }}
              columnMenu
              defaultHiddenColumns={['duration']}
              framed
              className="min-w-[52rem]"
              empty={{
                kind: 'no-results',
                title: 'No runs match these filters',
                description: 'Try another agent, a wider date range, or clear the filters to see every run.',
                actions: (
                  <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={clearFilters}>
                    Clear filters
                  </Button>
                ),
              }}
            />
          </>
        )}
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
