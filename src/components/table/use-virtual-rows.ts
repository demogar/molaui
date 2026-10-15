'use client'

import * as React from 'react'

/**
 * Windowing for DataTable: which rows of a long body are in the DOM.
 *
 * Written here rather than taken from a library. The package has three
 * runtime dependencies and a licence gate, and the case DataTable has to
 * cover is narrow: every row is one height, because density fixes `--row-h`
 * and no cell may set its own, so the position of a row is a multiplication.
 * The one thing of variable height is an open detail row, and those are few
 * and measured. `@tanstack/react-virtual` would do the same with a measuring
 * pass per row, at about 4 kB; this is under 1 kB and has nothing to keep up
 * to date. A screen whose rows really do vary in height should use that
 * library with the primitives (the "Virtualized" story shows the structure).
 *
 * What stays a real table:
 *   - the rows in view are real `<tr>`s between two spacer rows, so header
 *     association, `aria-sort` and the column menu are untouched;
 *   - `aria-rowcount` on the table and `aria-rowindex` on every row, header
 *     and detail rows counted, so a screen reader says "row 4,211 of 10,001"
 *     rather than counting the sixty it can see;
 *   - the row holding focus is kept in the DOM while it is scrolled away, so
 *     a reader who scrolls with the wheel does not lose focus to `<body>`;
 *   - eight rows of margin on each side, so Tab and Shift+Tab always find
 *     the next row's controls rendered, and the browser's scroll to the
 *     focused control brings the window along with it.
 *
 * What a virtual table cannot do, documented on the prop: find-in-page and
 * a screen reader's browse mode reach only the rows in the DOM, and printing
 * prints only those.
 */

/** Rows rendered past each edge of the view. */
export const OVERSCAN = 8
/** Rows rendered before the frame has been measured: server render, jsdom. */
export const INITIAL_ROWS = 30
/** `--row-h` at comfortable density, until a row is measured. */
const FALLBACK_ROW_H = 40

export interface VirtualRows {
  /** Row indexes to render, ascending; a gap between two is a spacer. */
  indexes: number[]
  /** The offset of row `i`'s top inside the body, detail rows included. */
  top: (i: number) => number
  /** The height of the whole body. */
  total: number
  /** `aria-rowindex` of row `i`: the header row is 1, open detail rows count. */
  rowIndex: (i: number) => number
  /** `aria-rowcount` of the table. */
  rowCount: number
  /** Keeps the row with this id rendered while focus is inside it. */
  pin: (id: string | null) => void
}

export function useVirtualRows({
  enabled,
  ids,
  expanded,
  table,
}: {
  enabled: boolean
  /** Every row's id, in display order. */
  ids: string[]
  /** Rows whose detail row is open; each adds its measured height. */
  expanded: ReadonlySet<string>
  /** The table element. Its parent is the scrolling frame. */
  table: React.RefObject<HTMLTableElement | null>
}): VirtualRows | null {
  const [rowH, setRowH] = React.useState(FALLBACK_ROW_H)
  const [details, setDetails] = React.useState<ReadonlyMap<string, number>>(() => new Map())
  const [range, setRange] = React.useState({ start: 0, end: INITIAL_ROWS })
  const [pinned, setPinned] = React.useState<string | null>(null)

  // Prefix sums over every row: 10,000 additions, well under a millisecond,
  // and only when the rows, the open set or a measured height change.
  const layout = React.useMemo(() => {
    if (!enabled) return null
    const n = ids.length
    const starts = new Float64Array(n + 1)
    const before = new Int32Array(n + 1)
    for (let i = 0; i < n; i++) {
      const id = ids[i] as string
      const open = expanded.has(id)
      starts[i + 1] = (starts[i] as number) + rowH + (open ? (details.get(id) ?? rowH * 2) : 0)
      before[i + 1] = (before[i] as number) + (open ? 1 : 0)
    }
    /** The last row whose top is at or above `y`. */
    const indexAt = (y: number) => {
      let lo = 0
      let hi = n
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if ((starts[mid] as number) <= y) lo = mid
        else hi = mid - 1
      }
      return Math.min(lo, Math.max(0, n - 1))
    }
    return { n, starts, before, indexAt }
  }, [enabled, ids, expanded, rowH, details])

  // Read through a ref, so the scroll listener sees this render's layout.
  // Not `useEffectEvent`: the package supports React 19.0, which lacks it.
  const measureRef = React.useRef<() => void>(() => {})
  const measure = () => {
    const el = table.current
    const frame = el?.parentElement
    if (!el || !frame || !layout) return
    const row = el.querySelector<HTMLElement>(':scope > tbody > tr[data-row-id]')
    const h = row?.getBoundingClientRect().height ?? 0
    if (h > 0 && Math.abs(h - rowH) > 0.5) setRowH(h)
    let next: Map<string, number> | null = null
    for (const tr of el.querySelectorAll<HTMLElement>(':scope > tbody > tr[data-detail-for]')) {
      const id = tr.dataset.detailFor as string
      const dh = tr.getBoundingClientRect().height
      if (dh > 0 && Math.abs((details.get(id) ?? 0) - dh) > 0.5) (next ??= new Map(details)).set(id, dh)
    }
    if (next) setDetails(next)
    const view = frame.clientHeight
    // Not laid out (jsdom, a hidden tab): keep the initial window rather
    // than collapse to the overscan alone.
    if (view <= 0) return
    const y = frame.scrollTop - (el.tHead?.getBoundingClientRect().height ?? 0)
    const start = Math.max(0, layout.indexAt(y) - OVERSCAN)
    const end = Math.min(layout.n, layout.indexAt(y + view) + 1 + OVERSCAN)
    setRange((r) => (r.start === start && r.end === end ? r : { start, end }))
  }

  React.useEffect(() => {
    const el = table.current
    const frame = el?.parentElement
    if (!enabled || !el || !frame) return
    const onScroll = () => measureRef.current()
    frame.addEventListener('scroll', onScroll, { passive: true })
    // The frame's height, and the rows' (a density change), move the window.
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onScroll)
    observer?.observe(frame)
    observer?.observe(el)
    return () => {
      frame.removeEventListener('scroll', onScroll)
      observer?.disconnect()
    }
  }, [enabled, table])

  // After every render, a measurement of the DOM it produced: a detail row
  // opened, the density changed the row height, the data shrank under the
  // scroll position. Each setter bails out when nothing changed, so this
  // settles in one extra render at most, before paint.
  React.useLayoutEffect(() => {
    measureRef.current = measure
    if (enabled) measureRef.current()
  })

  if (!layout) return null
  const { n, starts, before } = layout
  const start = Math.min(range.start, n)
  const end = Math.min(range.end, n)
  const indexes: number[] = []
  const pinnedAt = pinned === null ? -1 : ids.indexOf(pinned)
  if (pinnedAt >= 0 && pinnedAt < start) indexes.push(pinnedAt)
  for (let i = start; i < end; i++) indexes.push(i)
  if (pinnedAt >= end) indexes.push(pinnedAt)

  return {
    indexes,
    top: (i) => starts[i] as number,
    total: starts[n] as number,
    rowIndex: (i) => 2 + i + (before[i] as number),
    rowCount: 1 + n + (before[n] as number),
    pin: setPinned,
  }
}
