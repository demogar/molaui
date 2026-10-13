import { BookOpen, Plus, RotateCcw } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '../../components/app-shell/page-header'
import { Badge, type BadgeTone } from '../../components/badge'
import { Breadcrumb } from '../../components/breadcrumb'
import { Button } from '../../components/button'
import { EmptyState } from '../../components/empty-state'
import { Field, SearchInput } from '../../components/field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeletonRows,
} from '../../components/table'
import { ADMINS, type KnowledgeSource, SOURCES, type SyncState } from './_data'

/**
 * Knowledge sources: the documents a workspace's agents search when they
 * answer. The screen is ordinary on purpose: a header, a search field and a
 * table. What it demonstrates is everything around the table, the five
 * conditions in which there is no list to show, and why each one says
 * something different.
 *
 * ── four conversations, not one blank ──
 *   first run      nothing exists yet. The empty state takes the whole body
 *                  and its action creates the first source. The search field
 *                  is not drawn: a search over nothing is a control that can
 *                  only fail.
 *   no results     sources exist, the search hides them all. The count ("5
 *                  sources") and the search field stay, so the reader can see
 *                  the list is still there and only the question is wrong;
 *                  the empty state takes the table's place and its action
 *                  clears the search. It never says "connect your first
 *                  source": that would be a lie told to someone with five.
 *                  It was first a TableEmpty row inside the table, headers
 *                  kept. On a phone the five-column table scrolls sideways,
 *                  and TableEmpty centres on the table, not on what is
 *                  visible, so the message sat half off-screen.
 *   error          the list could not be loaded. Said once, as an alert, with
 *                  what is still true ("your sources are still connected")
 *                  and Retry. The header's Connect stays: connecting does not
 *                  depend on the list having loaded.
 *   no permission  the list exists and is not yours to see. It names the
 *                  people who can grant access, because "contact your
 *                  administrator" names nobody, and the header drops Connect,
 *                  because offering an action the reader cannot take is a
 *                  second refusal.
 *
 * ── loading is the table's shape, not a spinner ──
 * While the list loads, the table is drawn with its real headers and
 * skeleton rows, marked `aria-busy`, and one polite status says "Loading
 * knowledge sources". The skeleton has the shape of the answer, so nothing
 * jumps when the rows arrive.
 *
 * ── focus never lands nowhere ──
 * Clearing the search from the empty state removes the button that was
 * pressed, so focus goes back to the search field, where the next question
 * starts. Retry removes itself too, so once the rows are in, focus moves to
 * the heading of the list it re-asked for.
 */

export type SourcesStatus = 'ready' | 'loading' | 'error' | 'no-permission'

export interface SourcesScreenProps {
  sources?: KnowledgeSource[]
  status?: SourcesStatus
  defaultQuery?: string
  onConnect?: () => void
  onRetry?: () => void
  onRequestAccess?: () => void
}

const SYNC: Record<SyncState, { tone: BadgeTone; label: string }> = {
  synced: { tone: 'success', label: 'Synced' },
  syncing: { tone: 'info', label: 'Syncing' },
  failed: { tone: 'danger', label: 'Sync failed' },
}

const integer = new Intl.NumberFormat('en-US')

function ago(minutes: number | null) {
  if (minutes === null) return 'First sync running'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / (24 * 60))}d ago`
}

const COLUMNS = 5

export function SourcesScreen({
  sources = SOURCES,
  status = 'ready',
  defaultQuery = '',
  onConnect,
  onRetry,
  onRequestAccess,
}: SourcesScreenProps) {
  const [query, setQuery] = React.useState(defaultQuery)
  // SearchInput keeps its own ref for its clear button, so the input is
  // found through its Field rather than by a second ref on it.
  const searchField = React.useRef<HTMLDivElement>(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const uid = React.useId()
  const headingId = `${uid}-heading`

  // After a retry the rows replace the error, and the Retry button that had
  // focus goes with it: focus follows to the heading of what loaded. Only
  // after a retry; on a first load, focus is the reader's and stays put.
  const retried = React.useRef(false)
  React.useEffect(() => {
    if (status === 'ready' && retried.current) {
      retried.current = false
      headingRef.current?.focus()
    }
  }, [status])
  const retry = () => {
    retried.current = true
    onRetry?.()
  }

  const q = query.trim().toLowerCase()
  const visible = q ? sources.filter((s) => s.name.toLowerCase().includes(q) || s.kind.toLowerCase().includes(q)) : sources
  const firstRun = status === 'ready' && sources.length === 0
  const canConnect = status !== 'no-permission'

  const clearSearch = () => {
    setQuery('')
    searchField.current?.querySelector('input')?.focus()
  }

  const connect = (
    <Button icon={<Plus />} onClick={onConnect}>
      Connect source
    </Button>
  )

  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Support', href: '#support' }, { label: 'Knowledge sources' }]} />}
        title="Knowledge sources"
        description="What agents in Support can search when they answer. Each source syncs every hour."
        actions={canConnect ? connect : undefined}
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {status === 'error' ? (
          <EmptyState
            variant="error"
            size="lg"
            headingLevel={2}
            title="Knowledge sources didn’t load"
            description="The sources service didn’t answer within 10 seconds. Nothing has changed: your sources are still connected and agents can still search them."
            actions={
              <Button variant="secondary" icon={<RotateCcw />} onClick={retry}>
                Retry
              </Button>
            }
          />
        ) : status === 'no-permission' ? (
          <EmptyState
            variant="no-permission"
            size="lg"
            headingLevel={2}
            title="Only workspace admins can see sources"
            description={`Knowledge sources in Support are visible to its admins. ${ADMINS.join(' or ')} can make you one.`}
            actions={
              <Button variant="secondary" onClick={onRequestAccess}>
                Ask for access
              </Button>
            }
          />
        ) : firstRun ? (
          <EmptyState
            size="lg"
            headingLevel={2}
            title="No knowledge sources yet"
            description="Connect a help centre, a drive folder or a website, and agents in Support can search it when they answer."
            actions={
              <>
                {connect}
                <Button variant="ghost" icon={<BookOpen />}>
                  How sources work
                </Button>
              </>
            }
          />
        ) : (
          <section aria-labelledby={headingId} className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id={headingId} ref={headingRef} tabIndex={-1} className="m-0 font-ui text-base font-bold text-ink outline-none">
                {status === 'loading' ? 'Sources' : `${integer.format(sources.length)} ${sources.length === 1 ? 'source' : 'sources'}`}
              </h2>
              {status === 'ready' ? (
                <Field ref={searchField} label="Search sources" className="w-full sm:w-72">
                  {(control) => (
                    <SearchInput
                      {...control}
                      size="sm"
                      placeholder="Name or type"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  )}
                </Field>
              ) : null}
            </div>
            {status === 'loading' ? (
              <p role="status" className="sr-only">
                Loading knowledge sources
              </p>
            ) : null}
            {status === 'ready' && visible.length === 0 ? (
              <EmptyState
                variant="no-results"
                size="sm"
                headingLevel={3}
                title={`No sources match “${query.trim()}”`}
                description={`Search looks at each source’s name and type. Clear it to see all ${integer.format(sources.length)}.`}
                actions={
                  <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={clearSearch}>
                    Show all sources
                  </Button>
                }
              />
            ) : (
              <Table framed aria-labelledby={headingId} aria-busy={status === 'loading' || undefined} className="min-w-[40rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead numeric>Documents</TableHead>
                    <TableHead>Last synced</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status === 'loading' ? (
                    <TableSkeletonRows columns={COLUMNS} rows={4} />
                  ) : (
                    visible.map((source) => (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell className="text-ink-2">{source.kind}</TableCell>
                        <TableCell numeric>{integer.format(source.documents)}</TableCell>
                        <TableCell className="text-ink-muted">{ago(source.syncedMinutesAgo)}</TableCell>
                        <TableCell>
                          <Badge tone={SYNC[source.state].tone} dot>
                            {SYNC[source.state].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </section>
        )}
      </div>
    </>
  )
}
