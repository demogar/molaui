/**
 * The smallest text grammar a model answer needs, and no more: paragraphs,
 * bullet lists, fenced code, inline `code`, **strong**, and `[n]` citation
 * markers. A full Markdown parser is the consumer's call; this exists so the
 * streaming component can be shown working without one, and so that a
 * half-arrived token never throws — anything unmatched renders as text.
 */
export type InlineRun =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'cite'; n: number }

export type Block =
  | { kind: 'p'; inlines: InlineRun[] }
  | { kind: 'ul'; items: InlineRun[][] }
  | { kind: 'pre'; text: string }

// A fence runs to its closing ``` or, unclosed — the normal state mid-stream —
// to the end of the text. An opening ``` still waiting for the newline after
// its language tag is a fence too, but only at the very end: elsewhere a ```
// with no newline after it is just characters. Without that, "```" alone was
// a code block and "a\n\n```" was not, so the answer depended on where the
// text happened to be cut.
const FENCE_SPLIT = /(```[^\n]*(?:\n[\s\S]*?(?:```|$)|$))/g

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[\d{1,2}\])/g

export function parseInline(text: string): InlineRun[] {
  const out: InlineRun[] = []
  for (const part of text.split(INLINE)) {
    if (!part) continue
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) out.push({ kind: 'code', text: part.slice(1, -1) })
    else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) out.push({ kind: 'strong', text: part.slice(2, -2) })
    else if (/^\[\d{1,2}\]$/.test(part)) out.push({ kind: 'cite', n: Number(part.slice(1, -1)) })
    else out.push({ kind: 'text', text: part })
  }
  return out
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  // Fences first, so a blank line inside a code block does not split it.
  const segments = text.split(FENCE_SPLIT)
  for (const segment of segments) {
    if (!segment) continue
    if (segment.startsWith('```')) {
      blocks.push({ kind: 'pre', text: segment.replace(/^```[^\n]*(?:\n|$)/, '').replace(/```$/, '').replace(/\n$/, '') })
      continue
    }
    for (const chunk of segment.split(/\n{2,}/)) {
      const trimmed = chunk.trim()
      if (!trimmed) continue
      const lines = trimmed.split('\n')
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        blocks.push({ kind: 'ul', items: lines.map((line) => parseInline(line.replace(/^\s*[-*]\s+/, ''))) })
      } else {
        blocks.push({ kind: 'p', inlines: parseInline(lines.join(' ')) })
      }
    }
  }
  return blocks
}

/**
 * How much of `text` is settled: the length up to the last block boundary
 * that nothing appended later can move. A boundary is the end of a closed
 * fence, or the end of a blank-line run outside a fence. An unclosed fence is
 * never settled, because its blank lines belong to it.
 *
 * Why appended text cannot move an earlier boundary: `parseBlocks` splits
 * fences leftmost-first, and a fence opens at ``` followed by a newline. A
 * settled prefix ends in a newline, so any ``` inside it already had its
 * newline and was matched as a fence when the boundary was found.
 */
export function settledLength(text: string): number {
  let offset = 0
  let settled = 0
  for (const segment of text.split(FENCE_SPLIT)) {
    if (segment.startsWith('```')) {
      if (/^```[^\n]*\n[\s\S]*```$/.test(segment)) settled = offset + segment.length
    } else {
      const runs = [...segment.matchAll(/\n{2,}/g)]
      const lastRun = runs.at(-1)
      if (lastRun) settled = offset + lastRun.index + lastRun[0].length
    }
    offset += segment.length
  }
  return settled
}

/**
 * `parseBlocks` for text that only grows, at the cost of the block still
 * arriving rather than the whole answer.
 *
 * Parsing every chunk from the top made each token cost the length of
 * everything before it: 20,000 tokens arriving four at a time took 3.3s of
 * parsing alone, and every finished paragraph re-rendered on every chunk.
 * Here the settled prefix is parsed once and its blocks are kept — the same
 * objects, so a memoised block component sees an unchanged prop and skips —
 * and only the tail after the last boundary is parsed again.
 *
 * If the text is ever rewritten rather than appended to, the cache no longer
 * matches and the parser starts again from the top, so it is never wrong,
 * only slower. `parse` is injectable for the test that guards the cost.
 */
export function createBlockParser(parse: (text: string) => Block[] = parseBlocks) {
  let settledText = ''
  let settled: Block[] = []
  return (text: string): Block[] => {
    if (!text.startsWith(settledText)) {
      settledText = ''
      settled = []
    }
    const from = settledText.length
    const end = from + settledLength(text.slice(from))
    if (end > from) {
      settled = settled.concat(parse(text.slice(from, end)))
      settledText = text.slice(0, end)
    }
    const tail = end < text.length ? parse(text.slice(end)) : []
    return tail.length > 0 ? settled.concat(tail) : settled
  }
}
