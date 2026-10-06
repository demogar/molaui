import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { Badge, type BadgeTone } from '../badge'
import { Button } from '../button'
import { type AgentRun, formatDuration, formatRelative, makeAgentRuns, type RunStatus } from './agent-runs.fixture'
import { DataTable, type DataTableColumn, type DataTableSort } from './data-table'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeletonRows,
} from './table'

const meta = {
  title: 'Components/Data display/Table',
  component: Table,
  parameters: {
    docs: {
      description: {
        component:
          'Tables are read for hours, so every choice is about the eye travelling down a column. Rows take their height from `--row-h` (switch **Density**: compact fits ~40% more runs on a laptop screen). Numbers are right-aligned in tabular figures. Row dividers are quiet `--keyline-soft`; the header rule is ink — the one structural edge, where labels stop and data starts. Header labels sit in the rótulo register so they never read as a first row of data.',
      },
    },
  },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const runs = makeAgentRuns(40)

const STATUS_TONE: Record<RunStatus, BadgeTone> = {
  succeeded: 'success',
  running: 'info',
  failed: 'danger',
  queued: 'neutral',
  // A person stopped it: stated without alarm, as RunStatus does. Gold is
  // for work that is waiting on someone.
  cancelled: 'neutral',
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot pulse={status === 'running'}>
      {status}
    </Badge>
  )
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
})
const integer = new Intl.NumberFormat('en-US')

const columns: DataTableColumn<AgentRun>[] = [
  {
    key: 'id',
    header: 'Run',
    width: '9.5rem',
    cell: (run) => <span className="literal text-ink-2">{run.id}</span>,
  },
  { key: 'agent', header: 'Agent', sortable: true, truncate: true, cell: (run) => <span className="font-medium">{run.agent}</span> },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '8.5rem',
    cell: (run) => <RunStatusBadge status={run.status} />,
  },
  { key: 'model', header: 'Model', width: '11rem', cell: (run) => <span className="literal text-ink-2">{run.model}</span> },
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
  {
    key: 'duration',
    header: 'Duration',
    sortable: true,
    align: 'end',
    width: '6.5rem',
    cell: (run) => formatDuration(run.duration),
  },
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

function AgentRunsDemo() {
  const [selection, setSelection] = React.useState<Set<string>>(new Set([runs[3]!.id, runs[5]!.id]))
  return (
    <DataTable
      label="Agent runs"
      noun={{ one: 'run', other: 'runs' }}
      columns={columns}
      rows={runs}
      getRowId={(run) => run.id}
      rowLabel={(run) => `Select ${run.id}`}
      selectable
      selection={selection}
      onSelectionChange={setSelection}
      bulkActions={() => (
        <>
          <Button size="sm" variant="secondary">
            Re-run
          </Button>
          <Button size="sm" variant="danger">
            Cancel runs
          </Button>
        </>
      )}
      defaultSort={{ key: 'startedAt', direction: 'descending' }}
      stickyHeader
      framed
      frameClassName="max-h-[32rem]"
      className="min-w-[56rem]"
    />
  )
}

export const AgentRuns: Story = {
  name: 'Data table — agent runs',
  render: () => <AgentRunsDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Sort cycles ascending → descending → off; the third state is the only way back to arrival order, which is often the meaningful one. Selected rows put a bulk-action bar above the table, in the same gold wash and leading ink bar as the rows themselves; the bar has a fixed height, so trading the count for the actions never moves the table under the pointer. The count is announced once, from a single polite status inside the table, not from the visible bar. Selection is gold — the layer this system marks a choice with, and its text-selection colour — washed so every ink still clears AA, with an ink bar on the leading edge so the state never rests on hue alone. Machine literals (run ids, model ids) are in Martian Mono; every figure is Archivo with tabular numerals.',
      },
    },
  },
}

export const Primitives: Story = {
  render: () => (
    <Table framed aria-label="Spend by model">
      <TableCaption>Spend over the last 7 days. Figures are rounded to the cent.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead numeric>Runs</TableHead>
          <TableHead numeric>Tokens</TableHead>
          <TableHead numeric>Spend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="literal">cayuco-deep-3</TableCell>
          <TableCell numeric>412</TableCell>
          <TableCell numeric>9,841,220</TableCell>
          <TableCell numeric>$442.85</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="literal">cayuco-steady-3</TableCell>
          <TableCell numeric>2,118</TableCell>
          <TableCell numeric>31,004,118</TableCell>
          <TableCell numeric>$372.05</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="literal">cayuco-swift-2</TableCell>
          <TableCell numeric>9,670</TableCell>
          <TableCell numeric>58,220,941</TableCell>
          <TableCell numeric>$174.66</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell numeric>12,200</TableCell>
          <TableCell numeric>99,066,279</TableCell>
          <TableCell numeric>$989.56</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const Loading: Story = {
  render: () => (
    <DataTable label="Agent runs" columns={columns} rows={[]} getRowId={(run) => run.id} loading framed />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Skeleton rows at the real row height, so nothing jumps when data lands. Bar widths follow a fixed pattern rather than `Math.random()`, so a re-render does not make the skeleton twitch.',
      },
    },
  },
}

export const Empty: Story = {
  render: () => (
    <DataTable
      label="Agent runs"
      columns={columns}
      rows={[]}
      getRowId={(run) => run.id}
      framed
      empty="Runs appear here as soon as an agent starts one."
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The empty state is a row, not a replacement: the headers stay, so the reader still knows what would have been here.',
      },
    },
  },
}

export const EmptyPrimitive: Story = {
  name: 'Empty (primitives)',
  render: () => (
    <Table framed aria-label="Queued runs">
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead numeric>Waiting</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty colSpan={2} title="The queue is clear">
          Runs appear here while they wait for a worker.
        </TableEmpty>
      </TableBody>
    </Table>
  ),
}

export const SkeletonRows: Story = {
  render: () => (
    <Table framed aria-label="Loading" aria-busy>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead numeric>Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableSkeletonRows columns={3} rows={4} />
      </TableBody>
    </Table>
  ),
}

export const Paginated: Story = {
  render: () => (
    <DataTable
      label="Agent runs"
      noun={{ one: 'run', other: 'runs' }}
      columns={columns}
      rows={runs}
      getRowId={(run) => run.id}
      defaultSort={{ key: 'startedAt', direction: 'descending' }}
      pageSize={10}
      paginationVariant="pages"
      columnMenu
      defaultHiddenColumns={['model']}
      framed
      className="min-w-[48rem]"
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Client-side: pass every row and a `pageSize`; the table sorts, then slices. A new sort goes back to page 1, because page 4 of “newest first” has nothing to do with page 4 of “most expensive”. **Columns** opens a menu of checkbox items that stays open while you choose several; the last visible column cannot be hidden, and a column marked `hideable: false` shows checked and disabled so the menu still says it exists.',
      },
    },
  },
}

const PAGE_SIZE = 8
const SERVER_TOTAL = 1284

/** A pretend endpoint: sorts and slices 1,284 runs after a short delay. */
const serverRuns = makeAgentRuns(SERVER_TOTAL, 11)
function fetchRuns(page: number, sort: DataTableSort | null): Promise<AgentRun[]> {
  const sorted = sort
    ? [...serverRuns].sort((a, b) => {
        const va = a[sort.key as keyof AgentRun] as number | string | Date
        const vb = b[sort.key as keyof AgentRun] as number | string | Date
        const d = va instanceof Date && vb instanceof Date ? va.getTime() - vb.getTime() : va < vb ? -1 : va > vb ? 1 : 0
        return sort.direction === 'ascending' ? d : -d
      })
    : serverRuns
  return new Promise((resolve) => setTimeout(() => resolve(sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)), 450))
}

function ServerSideDemo() {
  const [page, setPage] = React.useState(1)
  const [sort, setSort] = React.useState<DataTableSort | null>({ key: 'startedAt', direction: 'descending' })
  const [data, setData] = React.useState<{ key: string; rows: AgentRun[] }>({ key: '', rows: [] })
  const [selection, setSelection] = React.useState<Set<string>>(new Set())
  // Loading is derived: the rows on screen were fetched for another page or
  // order. A response for a page the reader has already left is dropped.
  const key = `${page}|${sort?.key}|${sort?.direction}`
  const loading = data.key !== key

  React.useEffect(() => {
    let live = true
    void fetchRuns(page, sort).then((rows) => {
      if (live) setData({ key, rows })
    })
    return () => {
      live = false
    }
  }, [key, page, sort])

  return (
    <DataTable
      label="All agent runs"
      noun={{ one: 'run', other: 'runs' }}
      manual
      columns={columns}
      rows={data.rows}
      rowCount={SERVER_TOTAL}
      getRowId={(run) => run.id}
      rowLabel={(run) => `Select ${run.id}`}
      loading={loading}
      sort={sort}
      onSortChange={setSort}
      page={page}
      onPageChange={setPage}
      pageSize={PAGE_SIZE}
      selectable
      selection={selection}
      onSelectionChange={setSelection}
      bulkActions={({ clear }) => (
        <Button size="sm" variant="secondary" onClick={clear}>
          Export
        </Button>
      )}
      framed
      className="min-w-[56rem]"
    />
  )
}

export const ServerSide: Story = {
  name: 'Server-side data',
  render: () => <ServerSideDemo />,
  parameters: {
    docs: {
      description: {
        story:
          '`manual` hands sorting and paging to the server: `rows` is one page, already sorted, and `rowCount` is the total. The table reports `onSortChange` and `onPageChange` and applies neither, so the header shows the sort the parent actually applied, not the one that was clicked. Selection is a set of ids and survives paging. Here a pretend endpoint answers after 450ms; the skeleton rows hold the page’s height while it does.',
      },
    },
  },
}

export const NoResults: Story = {
  render: () => (
    <DataTable
      label="Agent runs"
      columns={columns}
      rows={[]}
      getRowId={(run) => run.id}
      framed
      empty={{
        variant: 'no-results',
        title: 'No runs match these filters',
        description: 'Nothing failed in the Support workspace in the last 24 hours.',
        actions: (
          <Button size="sm" variant="secondary">
            Clear filters
          </Button>
        ),
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The empty row is `EmptyState`, without its own keyline because the table frame is already the edge. Pass it as data to pick the conversation: *no results* clears the filters; it never tells someone to create their first run.',
      },
    },
  },
}

const ROW_COUNT = 10_000
const OVERSCAN = 8
const bigRuns = makeAgentRuns(ROW_COUNT, 3)

/**
 * Windowing with the primitives: only the rows in view (plus a margin) are in
 * the DOM, between two spacer rows that keep the scrollbar honest. Rows are
 * one height because density fixes `--row-h`, so the arithmetic is a division.
 */
function VirtualizedDemo() {
  const frameRef = React.useRef<HTMLTableSectionElement>(null)
  const [range, setRange] = React.useState({ start: 0, end: 40 })

  React.useLayoutEffect(() => {
    const frame = frameRef.current?.closest<HTMLElement>('[data-slot="table-frame"]')
    if (!frame) return
    const measure = () => {
      const rowH = frame.querySelector('tbody tr[aria-rowindex]')?.getBoundingClientRect().height || 40
      const start = Math.max(0, Math.floor(frame.scrollTop / rowH) - OVERSCAN)
      const end = Math.min(ROW_COUNT, Math.ceil((frame.scrollTop + frame.clientHeight) / rowH) + OVERSCAN)
      setRange((r) => (r.start === start && r.end === end ? r : { start, end }))
    }
    measure()
    frame.addEventListener('scroll', measure, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(frame)
    return () => {
      frame.removeEventListener('scroll', measure)
      observer?.disconnect()
    }
  }, [])

  const visible = bigRuns.slice(range.start, range.end)
  return (
    <Table
      aria-label="Ten thousand agent runs"
      aria-rowcount={ROW_COUNT + 1}
      stickyHeader
      framed
      frameClassName="h-[28rem]"
      className="min-w-[44rem]"
    >
      <colgroup>
        <col style={{ width: '9.5rem' }} />
        <col />
        <col style={{ width: '8.5rem' }} />
        <col style={{ width: '7rem' }} />
      </colgroup>
      <TableHeader ref={frameRef}>
        <TableRow aria-rowindex={1}>
          <TableHead>Run</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead numeric>Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <tr aria-hidden style={{ height: `calc(${range.start} * var(--row-h))` }} />
        {visible.map((run, i) => (
          <TableRow key={run.id} aria-rowindex={range.start + i + 2}>
            <TableCell className="literal text-ink-2">{run.id}</TableCell>
            <TableCell truncate>{run.agent}</TableCell>
            <TableCell>
              <RunStatusBadge status={run.status} />
            </TableCell>
            <TableCell numeric>{run.status === 'queued' ? '—' : currency.format(run.cost)}</TableCell>
          </TableRow>
        ))}
        <tr aria-hidden style={{ height: `calc(${ROW_COUNT - range.end} * var(--row-h))` }} />
      </TableBody>
    </Table>
  )
}

export const Virtualized: Story = {
  render: () => <VirtualizedDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Ten thousand rows, about sixty in the DOM. `DataTable` does not virtualize: most internal tables are paged, and a virtual list changes how find-in-page, printing and screen readers see the data, so it should be a decision per screen, not a default. The path is the primitives: render the rows in view between two spacer rows sized in `--row-h` (density fixes every row’s height, so the arithmetic is a division), and set `aria-rowcount` on the table and `aria-rowindex` on each row so assistive tech reports “row 4,211 of 10,001” instead of the 60 it can see. For rows of varying height, use `@tanstack/react-virtual` (`useVirtualizer` with the frame as its scroll element) in the same structure; it is not a dependency of this package, because the fixed-height case needs none.',
      },
    },
  },
}
