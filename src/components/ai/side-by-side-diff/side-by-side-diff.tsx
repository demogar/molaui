'use client'

import * as React from 'react'

import { cn } from '../../../lib/cn'
import { useScrollEdge } from '../../../lib/scroll-edge'
import { ChangeCount } from '../change-review/change-count'
import { GUTTER, LINE_GLYPH, LINE_WASH, LineCode } from '../change-review/diff-line'
import { UnifiedLines } from '../change-review/file-diff'
import {
  countChanges,
  diffLines,
  numberHunk,
  pairLines,
  parseUnifiedDiff,
  type DiffHunk,
  type DiffHunkInput,
  type DiffLine,
} from '../change-review/parse-diff'

export interface SideBySideDiffProps extends Omit<React.ComponentProps<'section'>, 'children' | 'title'> {
  /** What is being compared, as a heading: “System prompt, triage agent”. */
  title: React.ReactNode
  /** The text before the change. With `after`, the diff is worked out for you. */
  before?: string
  /** The text after the change. */
  after?: string
  /** Or one unified diff, as `git diff` prints it. Wins over `before` and `after`. */
  diff?: string
  /** Or the hunks, structured. Wins over `diff`. */
  hunks?: readonly (DiffHunk | DiffHunkInput)[]
  /** Unchanged lines kept around each change when the diff is worked out from `before` and `after`. Defaults to 3. */
  context?: number
  /** The old pane's name, shown above it and naming its scroll region. Defaults to “Before”. */
  beforeLabel?: string
  /** The new pane's name. Defaults to “After”. */
  afterLabel?: string
  /** Heading level for the title. Defaults to 4, under a `ChangeReview` heading. */
  headingLevel?: 3 | 4 | 5
}

/**
 * Two versions of one text, side by side: the old in one pane, the new in the
 * other, each change opposite its replacement.
 *
 * ── what it adds to FileDiff ──
 * `FileDiff` is a file inside a review: folding hunks, wrapped lines, a split
 * layout that pairs old and new inside each list item. This is the
 * comparison itself, for when the reader's job is to read across: a prompt
 * and its rewrite, a policy and its revision. Lines never wrap, because in
 * code and config the indentation is the structure (CodeBlock's argument),
 * and two wrapped panes stop lining up row for row. So each pane scrolls
 * sideways instead, with the scroll-edge cue (ADR 0009), and the two scroll
 * together, so the column the eye is comparing stays opposite itself. Both
 * panes are given the width of the longest line on either side; otherwise the
 * shorter pane would stop scrolling first and pull the other back.
 *
 * It composes with FileDiff rather than copying it: the same parser and
 * pairing, the same glyphs, washes and spoken words (diff-line.tsx), the same
 * `ChangeCount`, and below 48rem the same unified lines FileDiff draws, since
 * a phone has no room for two panes of code. It sits in a `ChangeReview`
 * beside FileDiffs.
 *
 * ── two regions, read in turn ──
 * Each pane is a focusable region named by its label and the title, so a
 * keyboard can scroll it and a screen reader can move between them. A screen
 * reader hears the old version, then the new, each line that changed
 * prefixed “Removed:” or “Added:”; the blank rows that keep the panes aligned
 * are hidden from it. Pairing old and new inside one row, as FileDiff's
 * split does, was the alternative, but it cannot scroll each side alone.
 *
 * ── state is never colour alone ──
 * A changed line is a wash, a +/− glyph and a word. The gutter, number and
 * glyph, stays put while the code scrolls under it, and is `select-none`
 * and hidden from assistive technology, so a copy is code.
 */
export function SideBySideDiff({
  title,
  before,
  after,
  diff,
  hunks: hunksProp,
  context = 3,
  beforeLabel = 'Before',
  afterLabel = 'After',
  headingLevel = 4,
  className,
  ...props
}: SideBySideDiffProps) {
  const hunks = React.useMemo(() => {
    if (hunksProp) return hunksProp.map((h) => (isNumbered(h) ? h : numberHunk(h)))
    if (diff !== undefined) return parseUnifiedDiff(diff)
    return diffLines(before ?? '', after ?? '', { context })
  }, [hunksProp, diff, before, after, context])
  const { added, removed } = countChanges(hunks)
  const Heading = `h${headingLevel}` as const
  const headingId = React.useId()

  // The longest line on either side, in characters, so both panes scroll the
  // same distance. Tabs are counted at the tab size the panes use.
  const widest = React.useMemo(
    () => Math.max(0, ...hunks.flatMap((h) => h.lines.map((l) => l.text.replace(/\t/g, '    ').length))),
    [hunks],
  )

  // The other pane is found from the one that scrolled, at the moment it
  // scrolls: the pair is fixed by the markup, so it needs no refs to hold.
  // Setting the other's scrollLeft fires its own scroll event, which finds the
  // two already level and stops.
  const follow = (event: React.UIEvent<HTMLDivElement>) => {
    const pane = event.currentTarget
    const left = pane.scrollLeft
    for (const other of pane.closest('[data-panes]')?.querySelectorAll<HTMLElement>('[role="region"]') ?? []) {
      if (other !== pane && Math.abs(other.scrollLeft - left) > 0.5) other.scrollLeft = left
    }
  }

  return (
    <section
      data-slot="side-by-side-diff"
      aria-labelledby={headingId}
      // `@container` so the panes follow the space the diff has, not the
      // viewport: a diff in a side panel on a wide screen is still narrow.
      className={cn('@container bg-cloth-pale shadow-cut forced-colors:p-px', className)}
      {...props}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-keyline px-3 py-2.5">
        <Heading id={headingId} data-part="title" className="m-0 min-w-0 flex-1 font-ui text-sm font-semibold text-ink">
          {title}
        </Heading>
        <ChangeCount data-part="count" added={added} removed={removed} className="shrink-0" />
      </header>
      {hunks.length === 0 ? (
        <p className="m-0 px-3 py-3 font-ui text-sm text-ink-muted">No line changes.</p>
      ) : (
        <>
          <div data-panes="" className="hidden grid-cols-2 @3xl:grid">
            {([0, 1] as const).map((side) => (
              <Pane
                key={side}
                side={side}
                label={side === 0 ? beforeLabel : afterLabel}
                headingId={headingId}
                hunks={hunks}
                widest={widest}
                onScroll={follow}
              />
            ))}
          </div>
          <div className="@3xl:hidden">
            {hunks.map((hunk, h) => (
              <React.Fragment key={h}>
                <HunkHeader hunk={hunk} side="both" first={h === 0} />
                <UnifiedLines lines={hunk.lines} />
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

const isNumbered = (hunk: DiffHunk | DiffHunkInput): hunk is DiffHunk =>
  hunk.lines.every((line) => 'oldNumber' in line || 'newNumber' in line)

function range(hunk: DiffHunk, side: 0 | 1 | 'both') {
  const oldRange = `-${hunk.oldStart},${hunk.lines.filter((l) => l.kind !== 'add').length}`
  const newRange = `+${hunk.newStart},${hunk.lines.filter((l) => l.kind !== 'remove').length}`
  return side === 0 ? oldRange : side === 1 ? newRange : `${oldRange} ${newRange}`
}

function HunkHeader({ hunk, side, first }: { hunk: DiffHunk; side: 0 | 1 | 'both'; first: boolean }) {
  return (
    <div data-part="hunk-header" className={cn('bg-cloth-shade', !first && 'border-t border-keyline')}>
      {/* In a pane: one line, held at the start while the pane scrolls
          sideways. In the one-column fallback nothing scrolls, so it wraps. */}
      <span
        dir="ltr"
        className={cn(
          'px-3 py-1 literal text-xs text-ink-2',
          side === 'both' ? 'block [overflow-wrap:anywhere]' : 'sticky inset-s-0 inline-block whitespace-nowrap',
        )}
      >
        @@ {range(hunk, side)} @@
        {hunk.section ? <span className="text-ink-muted"> {hunk.section}</span> : null}
      </span>
    </div>
  )
}

function Pane({
  side,
  label,
  headingId,
  hunks,
  widest,
  onScroll,
}: {
  side: 0 | 1
  label: string
  headingId: string
  hunks: DiffHunk[]
  widest: number
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void
}) {
  const labelId = React.useId()
  const ref = useScrollEdge<HTMLDivElement>()
  return (
    <div data-part="pane" data-side={side === 0 ? 'before' : 'after'} className={cn('flex min-w-0 flex-col', side === 1 && 'border-s border-keyline')}>
      <p id={labelId} data-part="pane-label" className="m-0 border-b border-keyline px-3 py-1.5 rotulo text-ink-2">
        {label}
      </p>
      <div
        ref={ref}
        role="region"
        aria-labelledby={`${labelId} ${headingId}`}
        tabIndex={0}
        dir="ltr"
        onScroll={onScroll}
        className="overflow-x-auto scroll-cloth scroll-edge focus-visible:focus-ring-inset"
      >
        {/* Wide enough for the longest line on either side, plus the gutter. */}
        <div className="w-max min-w-full literal text-xs leading-body [tab-size:4]" style={{ minWidth: `calc(${widest}ch + 6.25em)` }}>
          {hunks.map((hunk, h) => (
            <React.Fragment key={h}>
              <HunkHeader hunk={hunk} side={side} first={h === 0} />
              <ol className="m-0 list-none py-1 ps-0">
                {pairLines(hunk.lines).map((row, r) => (
                  <Row key={r} line={side === 0 ? row.old : row.new} side={side} />
                ))}
              </ol>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ line, side }: { line?: DiffLine; side: 0 | 1 }) {
  if (!line) {
    // Nothing on this side: the system's empty texture, hidden from a screen
    // reader, which hears each version as written.
    return (
      <li data-part="filler" aria-hidden className="relleno-field">
        {'​'}
      </li>
    )
  }
  // Context rows take the pane's ground so the sticky gutter covers the code
  // scrolling under it.
  const ground = LINE_WASH[line.kind] || 'bg-cloth-pale'
  const number = side === 0 ? line.oldNumber : line.newNumber
  return (
    <li data-part="line" data-kind={line.kind} className={cn('flex', ground)}>
      <span data-part="gutter" aria-hidden className={cn('sticky inset-s-0 flex shrink-0', ground)}>
        <span className={cn(GUTTER, 'w-[3.5em]')}>{number ?? ''}</span>
        <span className="w-[1.75em] select-none text-center text-ink-2">{LINE_GLYPH[line.kind]}</span>
      </span>
      <LineCode line={line} className="whitespace-pre pe-3 text-ink" />
    </li>
  )
}
