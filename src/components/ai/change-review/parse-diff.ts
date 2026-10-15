/**
 * Unified diff → hunks of numbered lines.
 *
 * A model proposes a change as the text `git diff` would print, because that
 * is what it was trained on and what a tool returns. The renderer wants lines
 * that already know their old and new numbers, so the numbering is done once,
 * here, rather than by every layout that draws the lines.
 */

export type DiffLineKind = 'add' | 'remove' | 'context'

export interface DiffLine {
  kind: DiffLineKind
  text: string
  /** Line number in the old file; absent on an added line. */
  oldNumber?: number
  /** Line number in the new file; absent on a removed line. */
  newNumber?: number
}

export interface DiffHunk {
  oldStart: number
  newStart: number
  /** The text after the second `@@` — usually the enclosing function or section. */
  section?: string
  lines: DiffLine[]
}

/** A hunk as a caller writes it by hand: start lines and kinds, numbers filled in for you. */
export interface DiffHunkInput {
  oldStart: number
  newStart: number
  section?: string
  lines: readonly { kind: DiffLineKind; text: string }[]
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/

/** Number the lines of a hand-written hunk, as `parseUnifiedDiff` does for a parsed one. */
export function numberHunk({ oldStart, newStart, section, lines }: DiffHunkInput): DiffHunk {
  let oldN = oldStart
  let newN = newStart
  return {
    oldStart,
    newStart,
    ...(section ? { section } : {}),
    lines: lines.map(({ kind, text }) => {
      if (kind === 'add') return { kind, text, newNumber: newN++ }
      if (kind === 'remove') return { kind, text, oldNumber: oldN++ }
      return { kind, text, oldNumber: oldN++, newNumber: newN++ }
    }),
  }
}

/**
 * Parse the hunks of one file's unified diff. File headers (`diff --git`,
 * `index`, `---`, `+++`) are skipped — the path is `FileDiff`'s own prop —
 * and so is `\ No newline at end of file`, which is a fact about bytes, not a
 * line anyone reviews.
 */
export function parseUnifiedDiff(diff: string): DiffHunk[] {
  type Draft = { oldStart: number; newStart: number; section?: string; lines: { kind: DiffLineKind; text: string }[] }
  const hunks: Draft[] = []
  let current: Draft | undefined
  for (const raw of diff.replace(/\r\n/g, '\n').split('\n')) {
    const header = HUNK_HEADER.exec(raw)
    if (header) {
      current = { oldStart: Number(header[1]), newStart: Number(header[2]), section: header[3] || undefined, lines: [] }
      hunks.push(current)
      continue
    }
    if (!current || raw.startsWith('\\')) continue
    const mark = raw[0]
    if (mark === '+') current.lines.push({ kind: 'add', text: raw.slice(1) })
    else if (mark === '-') current.lines.push({ kind: 'remove', text: raw.slice(1) })
    else if (mark === ' ') current.lines.push({ kind: 'context', text: raw.slice(1) })
    // A bare empty line is a context line whose leading space was trimmed by
    // an editor — common in diffs pasted into a fixture — except at the very
    // end, where it is only the string's trailing newline.
    else if (raw === '') current.lines.push({ kind: 'context', text: '' })
  }
  for (const hunk of hunks) {
    while (hunk.lines.at(-1)?.kind === 'context' && hunk.lines.at(-1)?.text === '') hunk.lines.pop()
  }
  return hunks.map(numberHunk)
}

/** Lines added and removed across hunks — the figures `ChangeCount` shows. */
export function countChanges(hunks: readonly DiffHunk[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'add') added++
      else if (line.kind === 'remove') removed++
    }
  }
  return { added, removed }
}

/**
 * Pair a hunk's lines into rows for the split layout: context on both sides,
 * and each run of removals set against the additions that follow it, so a
 * changed line sits opposite its replacement. The longer side of a run gets
 * blank cells on the other.
 */
export function pairLines(lines: readonly DiffLine[]): { old?: DiffLine; new?: DiffLine }[] {
  const rows: { old?: DiffLine; new?: DiffLine }[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (line.kind === 'context') {
      rows.push({ old: line, new: line })
      i++
      continue
    }
    const removed: DiffLine[] = []
    const added: DiffLine[] = []
    while (lines[i]?.kind === 'remove') removed.push(lines[i++]!)
    while (lines[i]?.kind === 'add') added.push(lines[i++]!)
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      rows.push({ old: removed[k], new: added[k] })
    }
  }
  return rows
}

const splitLines = (text: string) => (text === '' ? [] : text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n'))

// Above this many cells the table that finds the longest common run of lines
// would take more memory than a diff on a page is worth (2,000,000 cells is
// 8 MB). Past it the changed middle is shown as removed, then added: still a
// true diff, only not the smallest one.
const MAX_CELLS = 2_000_000

/**
 * Two versions of a text → the hunks between them, numbered, with `context`
 * unchanged lines around each change (3 by default, as `git diff`).
 *
 * For when the caller holds both versions rather than a patch: a prompt and
 * the model's rewrite of it, a config before and after an agent edited it.
 * The result feeds `SideBySideDiff` or `FileDiff` alike.
 *
 * The lines common to both ends are trimmed first, so the usual case, one
 * edit in a long file, costs the edit and not the file. The middle is matched
 * by longest common subsequence, with removals placed before the additions
 * that replace them, as `git diff` prints them.
 */
export function diffLines(before: string, after: string, { context = 3 }: { context?: number } = {}): DiffHunk[] {
  const a = splitLines(before)
  const b = splitLines(after)
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++

  const ops: { kind: DiffLineKind; text: string }[] = a.slice(0, head).map((text) => ({ kind: 'context', text }))
  const am = a.slice(head, a.length - tail)
  const bm = b.slice(head, b.length - tail)
  const n = am.length
  const m = bm.length
  if (n * m > MAX_CELLS) {
    for (const text of am) ops.push({ kind: 'remove', text })
    for (const text of bm) ops.push({ kind: 'add', text })
  } else {
    // lcs[i * (m + 1) + j]: the longest common run of am[i..] and bm[j..].
    const width = m + 1
    const lcs = new Uint32Array((n + 1) * width)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * width + j] =
          am[i] === bm[j] ? lcs[(i + 1) * width + j + 1]! + 1 : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!)
      }
    }
    let i = 0
    let j = 0
    while (i < n || j < m) {
      if (i < n && j < m && am[i] === bm[j]) {
        ops.push({ kind: 'context', text: am[i]! })
        i++
        j++
      } else if (j >= m || (i < n && lcs[(i + 1) * width + j]! >= lcs[i * width + j + 1]!)) {
        ops.push({ kind: 'remove', text: am[i++]! })
      } else {
        ops.push({ kind: 'add', text: bm[j++]! })
      }
    }
  }
  for (const text of a.slice(a.length - tail)) ops.push({ kind: 'context', text })

  // Where each op sits in the old and the new file.
  let oldLine = 1
  let newLine = 1
  const at = ops.map((op) => {
    const here = { old: oldLine, new: newLine }
    if (op.kind !== 'add') oldLine++
    if (op.kind !== 'remove') newLine++
    return here
  })

  // Each change with `context` lines either side; two changes whose context
  // would touch or overlap share one hunk.
  const hunks: DiffHunk[] = []
  let k = 0
  while (k < ops.length) {
    if (ops[k]!.kind === 'context') {
      k++
      continue
    }
    const from = Math.max(0, k - context)
    let end = k
    for (;;) {
      while (end + 1 < ops.length && ops[end + 1]!.kind !== 'context') end++
      let next = end + 1
      while (next < ops.length && ops[next]!.kind === 'context') next++
      if (next < ops.length && next - end - 1 <= context * 2) end = next
      else break
    }
    const to = Math.min(ops.length, end + 1 + context)
    const lines = ops.slice(from, to)
    const hasOld = lines.some((l) => l.kind !== 'add')
    const hasNew = lines.some((l) => l.kind !== 'remove')
    // An empty side starts at line 0, as `@@ -0,0 +1,3 @@` says of a new file.
    hunks.push(numberHunk({ oldStart: at[from]!.old - (hasOld ? 0 : 1), newStart: at[from]!.new - (hasNew ? 0 : 1), lines }))
    k = to
  }
  return hunks
}
