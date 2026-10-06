import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { Badge, type BadgeTone } from '../badge'
import { Button } from '../button'
import { type AgentRun, formatDuration, formatRelative, makeAgentRuns, type RunStatus } from './agent-runs.fixture'
import { DataTable, type DataTableColumn } from './data-table'
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
  cancelled: 'warn',
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
      <div className="flex flex-col gap-3">
        <div className="flex min-h-(--control-h) items-center justify-between gap-4">
          <p className="m-0 text-sm text-ink-2 tabular-nums" aria-live="polite">
            {selection.size > 0 ? `${selection.size} of ${runs.length} runs selected` : `${runs.length} runs`}
          </p>
          {selection.size > 0 ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                Re-run
              </Button>
              <Button size="sm" variant="danger">
                Cancel runs
              </Button>
            </div>
          ) : null}
        </div>
        <DataTable
          label="Agent runs"
          columns={columns}
          rows={runs}
          getRowId={(run) => run.id}
          rowLabel={(run) => `Select ${run.id}`}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          defaultSort={{ key: 'startedAt', direction: 'descending' }}
          stickyHeader
          framed
          frameClassName="max-h-[32rem]"
          className="min-w-[56rem]"
        />
      </div>
  )
}

export const AgentRuns: Story = {
  name: 'Data table — agent runs',
  render: () => <AgentRunsDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Sort cycles ascending → descending → off; the third state is the only way back to arrival order, which is often the meaningful one. Selection is gold — the layer this system marks a choice with, and its text-selection colour — washed so every ink still clears AA, with an ink bar on the leading edge so the state never rests on hue alone. Machine literals (run ids, model ids) are in Martian Mono; every figure is Archivo with tabular numerals.',
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
      empty="No runs match these filters. Clear a filter, or widen the date range."
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
