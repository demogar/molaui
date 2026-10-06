import { Collapsible } from '@base-ui/react/collapsible'
import { ChevronRight } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../../lib/cn'

import { ChangeCount } from './change-count'
import {
  countChanges,
  numberHunk,
  pairLines,
  parseUnifiedDiff,
  type DiffHunk,
  type DiffHunkInput,
  type DiffLine,
} from './parse-diff'

export type FileChangeKind = 'added' | 'modified' | 'deleted' | 'renamed'

const KIND_LABEL: Record<FileChangeKind, string> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
}

// A filled square for a file that now exists in full, hollow for one that is
// gone, half for one that changed: the same cut-square vocabulary as a run
// status, so the kind survives greyscale. Forced colours reduce every mark
// to its outline; the word beside it still says which.
const KIND_MARK: Record<FileChangeKind, string> = {
  added: 'bg-verde',
  modified: 'bg-cloth-pale after:absolute after:inset-x-0 after:bottom-0 after:h-1/2 after:bg-oro',
  deleted: 'bg-cloth-pale',
  renamed: 'bg-cloth-pale after:absolute after:inset-y-0 after:end-0 after:w-1/2 after:bg-anil',
}

export interface FileDiffProps extends Omit<React.ComponentProps<'section'>, 'children'> {
  /** The file's path after the change. */
  path: string
  /** The path before a rename. */
  previousPath?: string
  kind?: FileChangeKind
  /** One file's unified diff, as `git diff` prints it. */
  diff?: string
  /** Or the hunks, structured. Wins over `diff`. */
  hunks?: readonly (DiffHunk | DiffHunkInput)[]
  /**
   * `unified` is one column of lines. `split` sets old against new side by
   * side once the diff's container is 48rem wide, and stays unified below
   * that — a phone has no room for two columns of code.
   */
  layout?: 'unified' | 'split'
  /** Start with every hunk collapsed. */
  defaultCollapsed?: boolean
  /** Heading level for the path. Defaults to 4, under a `ChangeReview` heading. */
  headingLevel?: 3 | 4 | 5
}

const isNumbered = (hunk: DiffHunk | DiffHunkInput): hunk is DiffHunk =>
  hunk.lines.every((line) => 'oldNumber' in line || 'newNumber' in line)

/**
 * One file's change, as a reviewer reads it.
 *
 * ── lines are a list, not a table ──
 * The first build was a `<table>`, which made a screen reader announce
 * "row 14 of 52, column 3" before every line of code: a diff has no columns
 * a reader navigates by, only an order. So each hunk is an ordered list and
 * each line an item, and the split layout pairs old and new inside one item.
 *
 * ── a change is a glyph, a wash and a word ──
 * An added line carries `+`, a green wash and visually hidden "Added:"; a
 * removed one `−`, a red wash and "Removed:". The wash alone is the colour
 * signal a red–green reader cannot use and forced colours removes; the glyph
 * survives both, and the word is what a screen reader hears.
 *
 * ── what a copy picks up ──
 * Line numbers and glyphs are `select-none` and `aria-hidden`: selecting a
 * hunk to paste into an editor should give code, not code interleaved with
 * gutters. The code is a literal with `dir="ltr"`, because a right-to-left
 * page must not reorder a line of source.
 *
 * ── hunks fold ──
 * Each hunk header is a toggle named by its own visible text, the `@@` range
 * and section. An `aria-label` ("Collapse hunk 2") was tried first and failed
 * axe's label-content-name-mismatch: a voice-control user says what they see.
 */
export function FileDiff({
  path,
  previousPath,
  kind = 'modified',
  diff,
  hunks: hunksProp,
  layout = 'unified',
  defaultCollapsed = false,
  headingLevel = 4,
  className,
  ...props
}: FileDiffProps) {
  const hunks = React.useMemo(
    () => (hunksProp ? hunksProp.map((h) => (isNumbered(h) ? h : numberHunk(h))) : parseUnifiedDiff(diff ?? '')),
    [hunksProp, diff],
  )
  const { added, removed } = countChanges(hunks)
  const Heading = `h${headingLevel}` as const
  const headingId = React.useId()

  return (
    <section
      data-slot="file-diff"
      data-kind={kind}
      aria-labelledby={headingId}
      // `@container` so the split layout follows the space the diff has, not
      // the viewport: a diff in a 400px side panel on a wide screen is still narrow.
      className={cn('@container bg-cloth-pale shadow-cut forced-colors:p-px', className)}
      {...props}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-keyline px-3 py-2.5">
        <span className="inline-flex shrink-0 items-center gap-1.5 rotulo text-ink-2">
          <span aria-hidden className={cn('relative inline-block size-[11px] overflow-hidden shadow-cut', KIND_MARK[kind])} />
          {KIND_LABEL[kind]}
        </span>
        {/* On a phone the path takes its own line under the kind and the count,
            so it breaks at its slashes rather than mid-name. */}
        <Heading
          id={headingId}
          className="order-last m-0 w-full min-w-0 literal text-sm font-medium text-ink [overflow-wrap:break-word] @md:order-none @md:w-auto @md:flex-1"
        >
          {previousPath ? (
            <>
              <span dir="ltr" className="text-ink-muted">
                <BreakablePath path={previousPath} />
              </span>
              <span className="text-ink-muted">
                <span aria-hidden> → </span>
                <span className="sr-only"> renamed to </span>
              </span>
            </>
          ) : null}
          <span dir="ltr">
            <BreakablePath path={path} />
          </span>
        </Heading>
        <ChangeCount added={added} removed={removed} className="ms-auto shrink-0 @md:ms-0" />
      </header>
      {hunks.length === 0 ? (
        <p className="m-0 px-3 py-3 font-ui text-sm text-ink-muted">
          {kind === 'renamed' ? 'Renamed without changes to its content.' : 'No line changes.'}
        </p>
      ) : (
        hunks.map((hunk, i) => (
          <Hunk key={i} hunk={hunk} layout={layout} defaultOpen={!defaultCollapsed} first={i === 0} />
        ))
      )}
    </section>
  )
}

/** A path with a break opportunity after each slash. */
function BreakablePath({ path }: { path: string }) {
  const parts = path.split('/')
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 ? (
        <>
          /<wbr />
        </>
      ) : null}
    </React.Fragment>
  ))
}

function Hunk({ hunk, layout, defaultOpen, first }: { hunk: DiffHunk; layout: 'unified' | 'split'; defaultOpen: boolean; first: boolean }) {
  const oldCount = hunk.lines.filter((l) => l.kind !== 'add').length
  const newCount = hunk.lines.filter((l) => l.kind !== 'remove').length
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className={cn(!first && 'border-t border-keyline')}>
      <Collapsible.Trigger
        className={cn(
          'group/hunk flex w-full min-h-(--control-h-sm) items-center gap-2 bg-cloth-shade px-3 py-1 text-start',
          'transition-colors duration-(--motion-cut) ease-cut hover:bg-ink-soft',
          'focus-visible:shadow-[inset_0_0_0_2px_var(--ink)]',
        )}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'size-3.5 shrink-0 text-ink-muted transition-transform duration-(--motion-cut) ease-cut',
            // Mirrored in RTL, so opening turns it the other way to point down.
            'rtl:-scale-x-100 group-data-[panel-open]/hunk:rotate-90 rtl:group-data-[panel-open]/hunk:-rotate-90',
          )}
        />
        <span dir="ltr" className="shrink-0 whitespace-nowrap literal text-xs text-ink-2">
          @@ -{hunk.oldStart},{oldCount} +{hunk.newStart},{newCount} @@
        </span>
        {/* A space between the two, for the accessible name; flex ignores it for layout. */}
        {hunk.section ? ' ' : null}
        {hunk.section ? <span className="min-w-0 truncate literal text-xs text-ink-muted">{hunk.section}</span> : null}
      </Collapsible.Trigger>
      <Collapsible.Panel>
        {layout === 'split' ? (
          <>
            <UnifiedLines lines={hunk.lines} className="@3xl:hidden" />
            <SplitLines lines={hunk.lines} className="hidden @3xl:block" />
          </>
        ) : (
          <UnifiedLines lines={hunk.lines} />
        )}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

const WASH: Record<DiffLine['kind'], string> = {
  add: 'bg-verde-soft',
  remove: 'bg-rojo-soft',
  context: '',
}
const GLYPH: Record<DiffLine['kind'], string> = { add: '+', remove: '−', context: '' }
const SPOKEN: Record<DiffLine['kind'], string> = { add: 'Added: ', remove: 'Removed: ', context: '' }

const gutter = 'select-none text-end tabular text-ink-muted'

function Code({ line }: { line: DiffLine }) {
  return (
    <span className="min-w-0 whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">
      {SPOKEN[line.kind] ? <span className="sr-only">{SPOKEN[line.kind]}</span> : null}
      <span dir="ltr">{line.text === '' ? '​' : line.text}</span>
    </span>
  )
}

function UnifiedLines({ lines, className }: { lines: readonly DiffLine[]; className?: string }) {
  return (
    <ol className={cn('m-0 list-none py-1 ps-0 literal text-xs leading-relaxed', className)}>
      {lines.map((line, i) => (
        <li
          key={i}
          data-kind={line.kind}
          className={cn('grid grid-cols-[2.75em_2.75em_1.5em_minmax(0,1fr)] pe-3 @md:grid-cols-[3.5em_3.5em_1.75em_minmax(0,1fr)]', WASH[line.kind])}
        >
          <span aria-hidden className={gutter}>
            {line.oldNumber ?? ''}
          </span>
          <span aria-hidden className={gutter}>
            {line.newNumber ?? ''}
          </span>
          <span aria-hidden className="select-none text-center text-ink-2">
            {GLYPH[line.kind]}
          </span>
          <Code line={line} />
        </li>
      ))}
    </ol>
  )
}

function SplitCell({ line, side, hidden }: { line?: DiffLine; side: 'old' | 'new'; hidden?: boolean }) {
  const number = side === 'old' ? line?.oldNumber : line?.newNumber
  return (
    <span
      aria-hidden={hidden || line === undefined ? true : undefined}
      className={cn(
        'grid grid-cols-[3.5em_1.75em_minmax(0,1fr)] pe-3',
        line ? WASH[line.kind] : 'bg-cloth-shade',
        side === 'new' && 'border-s border-keyline',
      )}
    >
      <span aria-hidden className={gutter}>
        {number ?? ''}
      </span>
      <span aria-hidden className="select-none text-center text-ink-2">
        {line ? GLYPH[line.kind] : ''}
      </span>
      {line ? <Code line={line} /> : <span />}
    </span>
  )
}

function SplitLines({ lines, className }: { lines: readonly DiffLine[]; className?: string }) {
  return (
    <ol className={cn('m-0 list-none py-1 ps-0 literal text-xs leading-relaxed', className)}>
      {pairLines(lines).map((row, i) => (
        <li key={i} className="grid grid-cols-2">
          <SplitCell line={row.old} side="old" />
          {/* A context line is the same text on both sides; a screen reader hears it once. */}
          <SplitCell line={row.new} side="new" hidden={row.new?.kind === 'context'} />
        </li>
      ))}
    </ol>
  )
}
