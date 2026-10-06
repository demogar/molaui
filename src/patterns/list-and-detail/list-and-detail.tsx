import { ArrowLeft, ListTree, Pause, Play, Plus } from 'lucide-react'
import * as React from 'react'
import { flushSync } from 'react-dom'

import { cn } from '../../lib/cn'
import { PageHeader } from '../../components/app-shell/page-header'
import { Badge, type BadgeTone } from '../../components/badge'
import { Button } from '../../components/button'
import { Callout } from '../../components/callout'
import { DescriptionList } from '../../components/description-list'
import { EmptyState } from '../../components/empty-state'
import { Stat, StatGroup } from '../../components/stat'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table'
import { Heading } from '../../components/typography'
import { type Agent, AGENTS, type AgentState, recentRuns, type RecentRunStatus } from './_data'

/**
 * The agents screen: every agent in the workspace on the start side, the one
 * you chose on the end side. The shape is list → detail, the most common
 * screen in an operations tool, so the decisions here are the reusable part.
 *
 * ── a container query, not a viewport breakpoint ──
 * The split needs about 48rem of its OWN width: an 18rem list and a detail
 * pane wide enough for three stat tiles. A viewport breakpoint cannot know
 * that — at 1024px with the shell's sidebar open, the content area is 784px;
 * with the sidebar collapsed to its rail it is 968px; in a docs iframe it is
 * whatever the iframe is. The pattern measures itself (`@container/agents`)
 * and collapses to one column whenever it is narrower, wherever it is put.
 *
 * ── one column means one pane at a time, and a visible way back ──
 * Narrow, choosing an agent replaces the list with its detail, and the
 * detail opens with a "Back to agents" button. The browser's back gesture
 * is not enough on its own: it is invisible, and in an embedded tool it
 * may leave the product altogether. Back returns focus to the agent you
 * came from, so a keyboard or screen-reader user resumes where they were
 * instead of at the top of the page. Opening moves focus to the detail's
 * heading for the same reason: the button that was pressed has just been
 * hidden, and focus on a hidden element is focus nowhere.
 *
 * Wide, focus stays in the list: both panes are on screen, and an operator
 * comparing agents goes down the list, not into each one.
 *
 * ── buttons with aria-current, not a listbox ──
 * Each agent is a button marked `aria-current` when it is the one shown. A
 * listbox was considered and rejected: its options cannot contain the badge
 * and the second line as anything a screen reader reads properly, and
 * selecting an agent here is navigation (in a product it is a route,
 * `/agents/:id`), which is what `aria-current` describes. Tab moves through
 * the agents and Enter or Space opens one, as with any button.
 *
 * The chosen agent is marked three ways — an ink bar on the leading edge, a
 * washed ground and a heavier name — the same cues as the sidebar's current
 * page, so "this one is open" looks the same everywhere in the product. Each
 * agent's state is a badge with a dot, a word and a tone, never the tone alone.
 */

const STATE: Record<AgentState, { tone: BadgeTone; label: string }> = {
  live: { tone: 'success', label: 'Live' },
  failing: { tone: 'danger', label: 'Failing' },
  paused: { tone: 'warn', label: 'Paused' },
  draft: { tone: 'neutral', label: 'Draft' },
}

const RUN_TONE: Record<RecentRunStatus, BadgeTone> = {
  succeeded: 'success',
  running: 'info',
  failed: 'danger',
  cancelled: 'warn',
}

const integer = new Intl.NumberFormat('en-US')
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

function ago(minutes: number) {
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / (24 * 60))}d ago`
}

function lastRun(minutes: number | null) {
  return minutes === null ? 'Never run' : `Last run ${ago(minutes)}`
}

function duration(seconds: number | null) {
  if (seconds === null) return '—'
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function AgentStateBadge({ state }: { state: AgentState }) {
  return (
    <Badge tone={STATE[state].tone} dot>
      {STATE[state].label}
    </Badge>
  )
}

export interface AgentsScreenProps {
  agents?: Agent[]
  /** The agent shown first. Defaults to the first in the list. */
  defaultSelectedId?: string
  /** Which pane a narrow screen starts on. Ignored when there is room for both. */
  defaultView?: 'list' | 'detail'
}

export function AgentsScreen({ agents = AGENTS, defaultSelectedId, defaultView = 'list' }: AgentsScreenProps) {
  const [selectedId, setSelectedId] = React.useState(defaultSelectedId ?? agents[0]?.id ?? null)
  const [view, setView] = React.useState<'list' | 'detail'>(defaultView)
  const itemRefs = React.useRef(new Map<string, HTMLButtonElement>())
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const backRef = React.useRef<HTMLButtonElement>(null)
  const uid = React.useId()
  const listHeadingId = `${uid}-list`
  const detailId = `${uid}-detail`

  const selected = agents.find((agent) => agent.id === selectedId) ?? null
  const failing = agents.filter((agent) => agent.state === 'failing').length

  // The Back button exists only in the one-column layout, so whether it is
  // displayed is the cheapest honest answer to "is the list about to be
  // hidden?" — the container query has already decided.
  const isSingleColumn = () => !!backRef.current && getComputedStyle(backRef.current).display !== 'none'

  // Focus moves after the render that shows the pane it is moving to —
  // an element inside a pane that is still `display: none` cannot take
  // focus — so the state change is flushed first.
  const open = (id: string) => {
    const single = isSingleColumn()
    flushSync(() => {
      setSelectedId(id)
      setView('detail')
    })
    if (single) headingRef.current?.focus()
  }

  const back = () => {
    flushSync(() => setView('list'))
    if (selectedId) itemRefs.current.get(selectedId)?.focus()
  }

  const header = (
    <PageHeader
      breadcrumb={
        <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
          <a href="#support" className="text-ink-2 underline decoration-keyline hover:text-ink">
            Support
          </a>
          <span aria-hidden className="mx-1.5">
            /
          </span>
          <span aria-current="page">Agents</span>
        </nav>
      }
      title="Agents"
      description="The agents that work in the Support workspace, what they run on and how they are doing."
      actions={<Button icon={<Plus />}>Create agent</Button>}
    />
  )

  if (agents.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <div className="p-4 sm:p-6">
          <EmptyState
            title="No agents in Support yet"
            description="An agent answers questions and calls tools on the workspace’s behalf. Create one, try it on a few prompts, then set it live."
            actions={<Button icon={<Plus />}>Create agent</Button>}
            headingLevel={2}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="@container/agents flex h-full min-h-0 flex-col">
      {header}
      <div className="grid min-h-0 flex-1 @3xl/agents:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]">
        <section
          aria-labelledby={listHeadingId}
          className={cn(
            'min-h-0 overflow-y-auto scroll-cloth bg-cloth-pale',
            '@3xl/agents:shadow-[inset_-1px_0_0_var(--keyline)] @3xl/agents:rtl:shadow-[inset_1px_0_0_var(--keyline)]',
            view === 'detail' && '@max-3xl/agents:hidden',
          )}
        >
          <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
            <h2 id={listHeadingId} className="m-0 rotulo text-ink-muted">
              All agents
            </h2>
            {/* `dir="auto"` on the whole phrase, not `ltr` on the numbers: isolating
                the 8 alone let an RTL page read it as "agents · 1 failing 8". */}
            <p dir="auto" className="m-0 text-xs text-ink-muted">
              {agents.length} agents{failing > 0 ? ` · ${failing} failing` : ''}
            </p>
          </div>
          <ul className="m-0 list-none p-0">
            {agents.map((agent) => {
              const current = agent.id === selectedId
              return (
                <li key={agent.id} className="border-b border-keyline last:border-b-0">
                  {/* The name is the visible text. The `{' '}` between the parts are
                      load-bearing: without them the computed name ran together as
                      "Support triageFailingcayuco-steady-3…". An aria-label with
                      commas was tried and rejected — it no longer matched the
                      visible text, which voice control ("click Support triage")
                      and axe's label-content-name-mismatch both rely on. */}
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) itemRefs.current.set(agent.id, node)
                      else itemRefs.current.delete(agent.id)
                    }}
                    aria-current={current ? 'true' : undefined}
                    aria-controls={detailId}
                    onClick={() => open(agent.id)}
                    className={cn(
                      'group/agent flex w-full cursor-pointer flex-col gap-1.5 px-4 py-3 text-start sm:px-5',
                      'bg-transparent text-ink transition-colors duration-(--motion-cut) ease-cut',
                      'hover:bg-ink-soft focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none',
                      'aria-[current=true]:bg-ink-soft aria-[current=true]:forced-selected',
                      'aria-[current=true]:shadow-[inset_3px_0_0_var(--ink)] rtl:aria-[current=true]:shadow-[inset_-3px_0_0_var(--ink)]',
                      'aria-[current=true]:focus-visible:shadow-[var(--focus-ring)]',
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium group-aria-[current=true]/agent:font-semibold">
                        {agent.name}
                      </span>{' '}
                      <AgentStateBadge state={agent.state} />
                    </span>{' '}
                    <span className="flex w-full items-center justify-between gap-3 text-xs text-ink-muted">
                      <span className="literal truncate">{agent.model}</span>{' '}
                      <span dir="auto" className="shrink-0">
                        {lastRun(agent.lastRunMinutes)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <div
          id={detailId}
          className={cn('min-h-0 min-w-0 overflow-y-auto scroll-cloth', view === 'list' && '@max-3xl/agents:hidden')}
        >
          <div className="@container/detail flex flex-col gap-6 p-4 sm:p-6">
            <Button
              ref={backRef}
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="rtl:-scale-x-100" />}
              onClick={back}
              className="-ms-2 self-start @3xl/agents:hidden"
            >
              Back to agents
            </Button>
            {selected ? <AgentDetail agent={selected} headingRef={headingRef} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentDetail({ agent, headingRef }: { agent: Agent; headingRef: React.Ref<HTMLHeadingElement> }) {
  const runs = recentRuns(agent)
  const uid = React.useId()

  return (
    <article aria-labelledby={`${uid}-name`} className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Heading level={2} id={`${uid}-name`} ref={headingRef} tabIndex={-1} className="outline-none">
              {agent.name}
            </Heading>
            <AgentStateBadge state={agent.state} />
          </div>
          <p className="m-0 literal text-xs text-ink-muted">{agent.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {agent.state === 'paused' ? (
            <Button variant="secondary" icon={<Play />}>
              Resume agent
            </Button>
          ) : agent.state !== 'draft' ? (
            <Button variant="secondary" icon={<Pause />}>
              Pause agent
            </Button>
          ) : null}
          {agent.state === 'draft' ? (
            <Button icon={<Play />}>Start a test run</Button>
          ) : (
            <Button icon={<ListTree />}>View runs</Button>
          )}
        </div>
      </header>

      {agent.state === 'failing' && agent.successRate !== null ? (
        <Callout
          tone="danger"
          title={
            <>
              <span dir="auto">Success rate fell to {agent.successRate}% this week</span>
            </>
          }
        >
          Most failures are <span className="literal">route_ticket</span> timing out. Runs that fail keep their full trace
          for 30 days.
        </Callout>
      ) : null}

      <figure className="m-0 flex flex-col gap-2">
        <blockquote className="m-0 max-w-prose font-text text-lg leading-body text-ink">{agent.purpose}</blockquote>
        <figcaption className="text-xs text-ink-muted">Purpose, written by {agent.owner}</figcaption>
      </figure>

      {/* StatGroup's columns follow the viewport, so in a narrow pane on a wide
          screen it laid three tiles into 340px. The pane's own width decides. */}
      <StatGroup columns={3} className="sm:grid-cols-1 lg:grid-cols-1 @xl/detail:grid-cols-3">
        <Stat label="Runs, 24 hours" value={integer.format(agent.runs24h)} />
        <Stat
          label="Success rate, 7 days"
          value={agent.successRate === null ? '—' : agent.successRate}
          unit={agent.successRate === null ? undefined : '%'}
          trend={agent.trend}
        />
        <Stat label="Spend, 7 days" value={money.format(agent.spend7d)} />
      </StatGroup>

      <section aria-labelledby={`${uid}-config`} className="flex flex-col gap-3">
        <Heading level={3} id={`${uid}-config`}>
          Configuration
        </Heading>
        <DescriptionList
          items={[
            { term: 'Model', detail: agent.model, literal: true },
            { term: 'Owner', detail: agent.owner },
            { term: 'Tools', detail: agent.tools.join(', '), literal: true },
            { term: 'Knowledge', detail: agent.knowledge ?? 'None' },
            {
              term: 'Created',
              detail: (
                <time dateTime={agent.createdOn} dir="ltr">
                  {day.format(new Date(`${agent.createdOn}T00:00:00Z`))}
                </time>
              ),
            },
          ]}
        />
      </section>

      <section aria-labelledby={`${uid}-runs`} className="flex flex-col gap-3">
        <Heading level={3} id={`${uid}-runs`}>
          Recent runs
        </Heading>
        {runs.length > 0 ? (
          <Table framed aria-labelledby={`${uid}-runs`}>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                {/* Dropped below 24rem so four columns fit a phone without a
                    sideways-scrolling frame. */}
                <TableHead numeric className="@max-sm/detail:hidden">
                  Duration
                </TableHead>
                <TableHead numeric>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="literal text-ink-2">{run.id}</TableCell>
                  <TableCell>
                    <Badge tone={RUN_TONE[run.status]} dot pulse={run.status === 'running'}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell numeric className="@max-sm/detail:hidden">
                    {duration(run.duration)}
                  </TableCell>
                  <TableCell numeric>
                    <span dir="auto" className="text-ink-muted">
                      {ago(run.minutesAgo)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            size="sm"
            title="No runs yet"
            description="A draft agent runs only when you test it. Its test runs appear here."
            actions={
              <Button size="sm" variant="secondary" icon={<Play />}>
                Start a test run
              </Button>
            }
            headingLevel={4}
          />
        )}
      </section>
    </article>
  )
}
