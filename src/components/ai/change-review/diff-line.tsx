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
export const LINE_SPOKEN: Record<DiffLine['kind'], string> = { add: 'Added: ', remove: 'Removed: ', context: '' }

/** Line numbers: hidden from a screen reader and from a copy. */
export const GUTTER = 'select-none text-end tabular text-ink-muted'

/**
 * A line's code with its spoken word. Pinned left-to-right, because a
 * right-to-left page must not reorder a line of source. An empty line holds a
 * zero-width space so its row keeps its height.
 */
export function LineCode({ line, className }: { line: DiffLine; className?: string }) {
  return (
    <span className={className}>
      {LINE_SPOKEN[line.kind] ? <span className="sr-only">{LINE_SPOKEN[line.kind]}</span> : null}
      <span dir="ltr">{line.text === '' ? '​' : line.text}</span>
    </span>
  )
}
