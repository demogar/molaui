'use client'

import * as React from 'react'

import { cn } from '../../../lib/cn'
import { type MessagesOverride, useMessages } from '../../../lib/messages'
import { measureScrollEdge, useScrollEdge } from '../../../lib/scroll-edge'
import { ChangeCount } from '../change-review/change-count'
import { GUTTER, LINE_GLYPH, LINE_WASH, LineCode, LineWords } from '../change-review/diff-line'
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
import { type SideBySideDiffMessages, sideBySideDiffMessages } from './messages'

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
  /** The old pane's name, shown above it and naming its scroll region. Defaults to “Before” (`messages.before`). */
  beforeLabel?: string
  /** The new pane's name. Defaults to “After” (`messages.after`). */
  afterLabel?: string
  /** Heading level for the title. Defaults to 4, under a `ChangeReview` heading. */
  headingLevel?: 3 | 4 | 5
  /** Words for translation: the pane names, the empty sentence and the words said before each changed line. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<SideBySideDiffMessages>
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
  beforeLabel,
  afterLabel,
  headingLevel = 4,
  messages,
  className,
  ...props
}: SideBySideDiffProps) {
  const [t] = useMessages('sideBySideDiff', sideBySideDiffMessages, messages)
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

  return (
    <LineWords.Provider value={t}>
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
        <p className="m-0 px-3 py-3 font-ui text-sm text-ink-muted">{t.noChanges}</p>
      ) : (
        <>
          {/* The divider is a column of its own, not a border on the after
              pane: that border made the after pane's scroller a pixel
              narrower, so it scrolled a pixel further than the before pane,
              and at the end of a line the two came to rest a pixel apart with
              the after pane's cue still drawn. A border, not a 1px gap over a
              keyline ground, because forced colours keep borders and repaint
              backgrounds. */}
          <div data-panes="" className="hidden grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] @3xl:grid">
            {([0, 1] as const).map((side) => (
              <React.Fragment key={side}>
                {side === 1 ? <div aria-hidden className="border-s border-keyline" /> : null}
                <Pane
                  side={side}
                  label={side === 0 ? (beforeLabel ?? t.before) : (afterLabel ?? t.after)}
                  headingId={headingId}
                  hunks={hunks}
                  widest={widest}
                />
              </React.Fragment>
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
    </LineWords.Provider>
  )
}

/**
 * The position each pane was last moved to by its partner, until that move's
 * own scroll event arrives.
 *
 * The two panes are kept level by moving one when the other scrolls. A scroll
 * event is dispatched at the next frame, not when the position is set, so the
 * moved pane's event arrived a frame late, by which time the pane the reader
 * was scrolling had gone on; the first version found the two apart and set
 * the reader's pane back to where it had been. Measured in Chromium, a pane
 * moved 10px a frame travelled 200px in 40 frames instead of 400, every
 * second step undone, and ten ArrowRight presses travelled 201px instead of
 * 400, because each write also cancelled the smooth scroll the key had
 * started. That was the jitter and the lag. So a pane's scroll event that
 * only reports the position its partner gave it is the echo and goes no
 * further; any other position is the reader's, and leads.
 *
 * One scroller holding both columns was considered, since it cannot fall out
 * of step. But a scroller is one window onto its content: two columns in it
 * scroll as one wide strip, so the after column slides away instead of
 * scrolling inside its own half, and a screen reader would find one region
 * where there are two versions. Letting whichever pane has the pointer or
 * focus lead was the other alternative; it misses scrolls that come with no
 * input event on the pane (find in page, a screen reader's cursor, the
 * pointer resting on one pane while the keyboard scrolls the other). The
 * echo is told apart by the event itself.
 */
const echoes = new WeakMap<HTMLElement, number>()

/**
 * Keeps the other pane level with the one that scrolled. The partner is found
 * from the markup at the moment of the scroll, so the pair needs no refs.
 */
function follow(event: React.UIEvent<HTMLElement>) {
  const pane = event.currentTarget
  // This scroll may only be the echo of the pane being moved to follow the
  // other one, which must not be sent back (see `echoes`).
  const echo = echoes.get(pane)
  echoes.delete(pane)
  if (echo !== undefined && Math.abs(pane.scrollLeft - echo) < 1) return
  for (const other of partners(pane)) moveTo(other, pane.scrollLeft)
  levelBeforePaint(pane)
}

/**
 * Moves the partners level once more just before this frame is painted.
 *
 * A scroll event reports where the pane was when the frame began, but a
 * smooth scroll the browser animates on the main thread (an arrow key or a
 * wheel notch, where the scroller is not composited) moves it again before
 * the paint, so the partner was painted a frame behind: 8/0, 22/8, 41/22 as
 * an arrow key's scroll ran. Called from the scroll event for every frame
 * after the first, and from the key or wheel event for the first, which
 * moves the pane before any scroll event says so. A partner that anything
 * else has moved meanwhile is left alone.
 */
function levelBeforePaint(pane: HTMLElement, wait = 0) {
  const others = partners(pane)
  const placed = others.map((other) => other.scrollLeft)
  const from = pane.scrollLeft
  requestAnimationFrame(() => {
    // A smooth scroll can take a frame or two to make its first move.
    if (pane.scrollLeft === from && wait > 0) return levelBeforePaint(pane, wait - 1)
    others.forEach((other, i) => {
      if (other.scrollLeft === placed[i]) moveTo(other, pane.scrollLeft)
    })
  })
}

const partners = (pane: HTMLElement) =>
  [...(pane.closest('[data-panes]')?.querySelectorAll<HTMLElement>('[role="region"]') ?? [])].filter((other) => other !== pane)

const leadBeforePaint = (event: React.SyntheticEvent<HTMLElement>) => levelBeforePaint(event.currentTarget, 3)

/** Moves a pane to its partner's position. */
function moveTo(pane: HTMLElement, left: number) {
  const was = pane.scrollLeft
  if (Math.abs(was - left) < 1) return
  pane.scrollLeft = left
  // Its cue now, not at its own event a frame later (see measureScrollEdge).
  measureScrollEdge(pane)
  // Read back rather than `left`: the browser clamps and snaps what it is
  // given, the cue coming off at the end moves the end, and an assignment
  // that changed nothing fires no event to wait for.
  const now = pane.scrollLeft
  if (now !== was) echoes.set(pane, now)
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
}: {
  side: 0 | 1
  label: string
  headingId: string
  hunks: DiffHunk[]
  widest: number
}) {
  const labelId = React.useId()
  const ref = useScrollEdge<HTMLDivElement>()
  return (
    <div data-part="pane" data-side={side === 0 ? 'before' : 'after'} className="flex min-w-0 flex-col">
      <p id={labelId} data-part="pane-label" className="m-0 border-b border-keyline px-3 py-1.5 rotulo text-ink-2">
        {label}
      </p>
      <div
        ref={ref}
        role="region"
        aria-labelledby={`${labelId} ${headingId}`}
        tabIndex={0}
        dir="ltr"
        onScroll={follow}
        onKeyDown={leadBeforePaint}
        onWheel={leadBeforePaint}
        className="overflow-x-auto scroll-cloth scroll-edge focus-visible:focus-ring-inset"
      >
        {/* Wide enough for the longest line on either side, plus the gutter,
            and never narrower than the pane. Both in the one inline min-width:
            a `min-w-full` class beside it was overridden by the inline style,
            so short lines left the washes and the hunk header stopping partway
            across the pane. */}
        <div className="w-max literal text-xs leading-body [tab-size:4]" style={{ minWidth: `max(100%, calc(${widest}ch + 6.25em))` }}>
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
