/**
 * The Markdown a model writes, parsed into blocks a renderer can map onto
 * Mola's typography, with `[n]` citation markers kept as markers.
 *
 * ── why an in-house parser ──
 * A general Markdown library was the first option and the wrong fit. The
 * ones that render to React (react-markdown with remark) weigh tens of
 * kilobytes gzipped once their syntax tree and plugins come along, against
 * a 165 kB budget for the whole library; the small string parsers (marked,
 * snarkdown) produce HTML, which would have to be injected with
 * `dangerouslySetInnerHTML` and sanitised, the one thing a renderer of
 * model text must never do. And none of them knows that a stream ends
 * mid-token: each would parse "**Star" as two asterisks and a word, then
 * flip it to bold a token later. What a model answer needs is a known
 * subset, so this is that subset and nothing else, 5 kB minified (2 kB gzipped),
 * producing plain objects that React renders as text. Raw HTML in the
 * input is never interpreted: `<b>` stays the three characters `<b>`.
 *
 * ── the subset ──
 * Blocks: ATX headings, paragraphs, bullet and numbered lists (nested by
 * indentation), block quotes, backtick-fenced code, thematic breaks and
 * pipe tables.
 * Inlines: `code`, **strong**, *emphasis*, ~~deletion~~, [links](url),
 * hard line breaks, backslash escapes and `[n]` citation markers. Setext
 * headings, indented code, reference links, footnotes and HTML are left as
 * text: models rarely write them, and each costs grammar the rest pays for.
 *
 * ── a blank line ends a block ──
 * Outside a fence, a blank line always closes the block before it, as it
 * does in `StreamingText`. That is what lets `createBlockParser` keep every
 * finished block and re-parse only the tail. CommonMark lets text after a
 * blank line change what came before it (a later indented line can turn a
 * finished list "loose"), which would make every token potentially rewrite
 * the answer. The cost is small: a numbered list split by blank lines
 * renders as consecutive lists that keep their numbering through `start`.
 *
 * ── streaming ──
 * `open` is true for the block still arriving. In it, a marker that has not
 * closed yet is closed at the end of the text, so "**Star" renders bold at
 * once instead of showing two asterisks that vanish a token later; a link
 * whose URL is still arriving shows its text; and a dangling `[1`, `#` or
 * `|` is held back until it can be read. An unclosed fence is a code block
 * that runs to the end, the normal state mid-stream. Nothing here throws:
 * anything that does not match is text.
 */
import { FENCE_SPLIT } from '../streaming-text/parse'

export type MarkdownInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; children: MarkdownInline[] }
  | { kind: 'em'; children: MarkdownInline[] }
  | { kind: 'del'; children: MarkdownInline[] }
  | { kind: 'link'; href: string; children: MarkdownInline[] }
  | { kind: 'cite'; n: number }
  | { kind: 'break' }

export type MarkdownAlign = 'start' | 'center' | 'end' | null

export type MarkdownBlock =
  | { kind: 'heading'; depth: number; inlines: MarkdownInline[] }
  | { kind: 'p'; inlines: MarkdownInline[] }
  | { kind: 'list'; ordered: boolean; start: number; items: MarkdownBlock[][] }
  | { kind: 'quote'; blocks: MarkdownBlock[] }
  | { kind: 'code'; language: string; text: string }
  | { kind: 'hr' }
  | { kind: 'table'; align: MarkdownAlign[]; head: MarkdownInline[][]; rows: MarkdownInline[][][] }

// ─── links ──────────────────────────────────────────────────────────────────

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto'])

/**
 * The href a link may have, or `undefined` for one it may not. Relative
 * paths, fragments and http(s)/mailto are kept; any other scheme —
 * `javascript:`, `data:`, `vbscript:` — is dropped and the link renders as
 * its text. Whitespace and control characters are removed before the scheme
 * is read, because browsers ignore them too: "java\tscript:" still runs.
 */
export function safeHref(raw: string): string | undefined {
  // eslint-disable-next-line no-control-regex
  const href = raw.replace(/[\u0000- \u007f]/g, '')
  if (href === '') return undefined
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)
  if (scheme && !SAFE_SCHEMES.has(scheme[1]!.toLowerCase())) return undefined
  return href
}

// ─── inlines ────────────────────────────────────────────────────────────────

const PUNCTUATION = /[!-/:-@[-`{-~]/
const isSpace = (ch: string | undefined) => ch === undefined || /\s/.test(ch)
const isWord = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch)

/** Where `marker` closes after `from`, or -1. Skips code spans and escapes. */
function findCloser(src: string, from: number, marker: string): number {
  let i = from
  while (i < src.length) {
    const ch = src[i]!
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '`') {
      const run = /^`+/.exec(src.slice(i))![0]
      const close = src.indexOf(run, i + run.length)
      if (close < 0) return -1
      i = close + run.length
      continue
    }
    if (src.startsWith(marker, i) && !isSpace(src[i - 1])) {
      // A single * or _ must not close on half of a double one.
      const single = marker.length === 1
      if (single && src[i + 1] === marker) {
        i += 2
        continue
      }
      if (marker[0] === '_' && isWord(src[i + marker.length])) {
        i += marker.length
        continue
      }
      // In "***both***" the strong closes on the last two of the three, so
      // the emphasis inside keeps its own closer.
      if (!single && src[i + 2] === marker[0]) return i + 1
      return i
    }
    i++
  }
  return -1
}

/** The `]` matching the `[` at `from`, or -1. */
function closingBracket(src: string, from: number): number {
  let depth = 0
  for (let i = from; i < src.length; i++) {
    const ch = src[i]
    if (ch === '\\') i++
    else if (ch === '[') depth++
    else if (ch === ']' && --depth === 0) return i
  }
  return -1
}

/**
 * Parse inline Markdown. With `open`, the text is the end of a stream:
 * unclosed markers close at the end instead of rendering as characters.
 */
export function parseInlines(src: string, open = false): MarkdownInline[] {
  const out: MarkdownInline[] = []
  let text = ''
  const flush = () => {
    if (text) out.push({ kind: 'text', text })
    text = ''
  }
  const push = (inline: MarkdownInline) => {
    flush()
    out.push(inline)
  }

  let i = 0
  while (i < src.length) {
    const ch = src[i]!
    const rest = src.slice(i)

    if (ch === '\\') {
      const next = src[i + 1]
      if (next === '\n') {
        push({ kind: 'break' })
        i += 2
        continue
      }
      if (next !== undefined && PUNCTUATION.test(next)) {
        text += next
        i += 2
        continue
      }
      text += ch
      i++
      continue
    }

    if (ch === '\n') {
      // Two spaces before a newline are a hard break; any other newline is a
      // space, as in every Markdown.
      if (/ {2,}$/.test(text)) {
        text = text.replace(/ +$/, '')
        push({ kind: 'break' })
      } else {
        text = text.replace(/ +$/, '') + ' '
      }
      i++
      continue
    }

    if (ch === '`') {
      const run = /^`+/.exec(rest)![0]
      const close = src.indexOf(run, i + run.length)
      if (close >= 0 || open) {
        const body = src.slice(i + run.length, close >= 0 ? close : src.length).replace(/\n/g, ' ')
        // One space each side is padding, so `` ` `` can hold a backtick.
        const code = /^ .*[^ ].* $/.test(body) ? body.slice(1, -1) : body
        if (code !== '' || close >= 0) push({ kind: 'code', text: code })
        i = close >= 0 ? close + run.length : src.length
        continue
      }
      text += run
      i += run.length
      continue
    }

    const delimiter = /^(\*\*|__|~~|\*|_)/.exec(rest)?.[0]
    if (delimiter) {
      const after = src[i + delimiter.length]
      const intraword = delimiter[0] === '_' && isWord(src[i - 1])
      if (!isSpace(after) && !intraword) {
        const close = findCloser(src, i + delimiter.length, delimiter)
        if (close > i + delimiter.length || (close < 0 && open)) {
          const inner = src.slice(i + delimiter.length, close < 0 ? src.length : close)
          const kind = delimiter === '~~' ? 'del' : delimiter.length === 2 ? 'strong' : 'em'
          push({ kind, children: parseInlines(inner, open && close < 0) })
          i = close < 0 ? src.length : close + delimiter.length
          continue
        }
      }
      text += delimiter
      i += delimiter.length
      continue
    }

    if (ch === '[') {
      const cite = /^\[(\d{1,3})\](?!\()/.exec(rest)
      if (cite) {
        push({ kind: 'cite', n: Number(cite[1]) })
        i += cite[0].length
        continue
      }
      // A marker or a link still arriving: held back rather than shown as
      // brackets that turn into a chip or a link a token later.
      if (open && /^\[\d{0,3}$/.test(rest)) break
      const close = closingBracket(src, i)
      if (close > i) {
        const label = src.slice(i + 1, close)
        // One level of balanced parentheses inside the URL, as in a wiki link.
        const target = /^\(((?:[^\s()]|\([^\s()]*\))*)(?:\s+"[^"]*")?\)/.exec(src.slice(close + 1))
        if (target) {
          const href = safeHref(target[1]!)
          const children = parseInlines(label)
          if (href) push({ kind: 'link', href, children })
          else {
            flush()
            out.push(...children)
          }
          i = close + 1 + target[0].length
          continue
        }
        if (open && /^\([^)]*$/.test(src.slice(close + 1))) {
          flush()
          out.push(...parseInlines(label))
          break
        }
      } else if (open && close < 0) {
        flush()
        out.push(...parseInlines(src.slice(i + 1), true))
        break
      }
      text += ch
      i++
      continue
    }

    text += ch
    i++
  }
  flush()
  return out
}

// ─── blocks ─────────────────────────────────────────────────────────────────

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*)|$)/
const QUOTE = /^ {0,3}> ?/
const TABLE_DELIMITER = /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/

function splitRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '\\' && row[i + 1] === '|') {
      cell += '|'
      i++
    } else if (row[i] === '|') {
      cells.push(cell.trim())
      cell = ''
    } else cell += row[i]
  }
  cells.push(cell.trim())
  return cells
}

const startsBlock = (line: string, next: string | undefined) =>
  HEADING.test(line) || HR.test(line) || LIST_ITEM.test(line) || QUOTE.test(line) || isTableStart(line, next)

const isTableStart = (line: string, next: string | undefined) =>
  line.includes('|') && next !== undefined && TABLE_DELIMITER.test(next) && next.includes('-')

/** Parse one run of lines with no blank line and no fence in it. */
function parseLines(lines: string[], open: boolean): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    const last = i === lines.length - 1

    // At the stream's end, a "#" with no text yet, or a table row whose
    // delimiter has not arrived, would flash as characters and then turn
    // into a heading or a table. They wait for the next token instead.
    if (open && last && (/^ {0,3}#{1,6}[ \t]*$/.test(line) || (/^ *\|/.test(line) && !blocks.length && i === 0))) break

    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', depth: heading[1]!.length, inlines: parseInlines(heading[2]!, open && last) })
      i++
      continue
    }

    if (HR.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    if (isTableStart(line, lines[i + 1])) {
      const head = splitRow(line)
      const align = splitRow(lines[i + 1]!).map<MarkdownAlign>((cell) =>
        cell.endsWith(':') ? (cell.startsWith(':') ? 'center' : 'end') : cell.startsWith(':') ? 'start' : null,
      )
      i += 2
      const rows: MarkdownInline[][][] = []
      while (i < lines.length && lines[i]!.includes('|') && !HEADING.test(lines[i]!)) {
        const cells = splitRow(lines[i]!)
        const rowOpen = open && i === lines.length - 1
        rows.push(head.map((_, c) => parseInlines(cells[c] ?? '', rowOpen)))
        i++
      }
      blocks.push({
        kind: 'table',
        align: head.map((_, c) => align[c] ?? null),
        head: head.map((cell) => parseInlines(cell)),
        rows,
      })
      continue
    }

    if (QUOTE.test(line)) {
      const inner: string[] = []
      while (i < lines.length && QUOTE.test(lines[i]!)) inner.push(lines[i++]!.replace(QUOTE, ''))
      blocks.push({ kind: 'quote', blocks: parseLines(inner, open && i === lines.length) })
      continue
    }

    const item = LIST_ITEM.exec(line)
    if (item) {
      const indent = item[1]!.length
      const ordered = /\d/.test(item[2]!)
      const items: string[][] = []
      while (i < lines.length) {
        const current = lines[i]!
        const match = LIST_ITEM.exec(current)
        if (match && match[1]!.length <= indent + 1) {
          if (/\d/.test(match[2]!) !== ordered) break
          items.push([match[3] ?? ''])
        } else if (match || /^\s/.test(current)) {
          // Deeper: a nested list or a continuation, with the item's indent removed.
          items.at(-1)!.push(current.replace(new RegExp(`^ {0,${indent + 2}}`), ''))
        } else if (!startsBlock(current, lines[i + 1])) {
          // A lazy continuation: wrapped text that lost its indent.
          items.at(-1)!.push(current)
        } else break
        i++
      }
      const listOpen = open && i === lines.length
      blocks.push({
        kind: 'list',
        ordered,
        start: ordered ? Number.parseInt(item[2]!, 10) : 1,
        items: items.map((body, k) => parseLines(body, listOpen && k === items.length - 1)),
      })
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length && (paragraph.length === 0 || !startsBlock(lines[i]!, lines[i + 1]))) {
      paragraph.push(lines[i++]!)
    }
    blocks.push({ kind: 'p', inlines: parseInlines(paragraph.join('\n').trim(), open && i === lines.length) })
  }
  return blocks
}

/**
 * Parse a Markdown answer into blocks. `open` marks the text as the end of a
 * stream still arriving (see the module comment).
 */
export function parseMarkdown(text: string, open = false): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const segments = text.replace(/\r\n?/g, '\n').split(FENCE_SPLIT)
  segments.forEach((segment, s) => {
    if (!segment) return
    const lastSegment = open && segments.slice(s + 1).every((rest) => rest === '')
    if (segment.startsWith('```')) {
      const newline = segment.indexOf('\n')
      // The language tag counts only once its line has ended: mid-stream,
      // "```py" is still on its way to "```python".
      const language = newline < 0 ? '' : segment.slice(3, newline).trim()
      const body = newline < 0 ? '' : segment.slice(newline + 1)
      blocks.push({ kind: 'code', language, text: body.replace(/```$/, '').replace(/\n$/, '') })
      return
    }
    const chunks = segment.split(/\n[ \t]*\n/)
    chunks.forEach((chunk, c) => {
      const lines = chunk.split('\n')
      while (lines.length && lines[0]!.trim() === '') lines.shift()
      while (lines.length && lines.at(-1)!.trim() === '') lines.pop()
      if (lines.length) blocks.push(...parseLines(lines, lastSegment && c === chunks.length - 1))
    })
  })
  return blocks
}
