'use client'

import * as React from 'react'

import { fileDiffMessages } from './messages'
import type { DiffLine } from './parse-diff'

/**
 * How one diff line says what it is, shared by `FileDiff` and
 * `SideBySideDiff` so the two layouts cannot drift apart: a wash for the eye,
 * a glyph that survives greyscale and forced colours, and a visually hidden
 * word for a screen reader. The wash alone would be colour alone.
 */
export const LINE_WASH: Record<DiffLine['kind'], string> = {
  add: 'bg-verde-soft',
  remove: 'bg-danger-soft',
  context: '',
}
export const LINE_GLYPH: Record<DiffLine['kind'], string> = { add: '+', remove: '−', context: '' }

/**
 * The hidden words, from the messages of the diff around the line. A context
 * rather than a prop, because FileDiff and SideBySideDiff each pass lines
 * through three layers of rows and cells to reach here.
 */
export const LineWords = React.createContext<{ added: string; removed: string }>(fileDiffMessages)

/** Line numbers: hidden from a screen reader and from a copy. */
export const GUTTER = 'select-none text-end tabular text-ink-muted'

/**
 * A line's code with its spoken word. Pinned left-to-right, because a
 * right-to-left page must not reorder a line of source. An empty line holds a
 * zero-width space so its row keeps its height.
 */
export function LineCode({ line, className }: { line: DiffLine; className?: string }) {
  const words = React.useContext(LineWords)
  const spoken = line.kind === 'add' ? words.added : line.kind === 'remove' ? words.removed : ''
  return (
    <span className={className}>
      {spoken ? (
        <span className="sr-only">
          {spoken}{' '}
        </span>
      ) : null}
      <span dir="ltr">{line.text === '' ? '​' : line.text}</span>
    </span>
  )
}
