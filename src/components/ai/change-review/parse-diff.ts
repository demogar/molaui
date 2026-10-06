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
