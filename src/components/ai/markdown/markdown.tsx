'use client'

import * as React from 'react'

import { cn } from '../../../lib/cn'
import { CodeBlock, type CodeLanguage } from '../../code'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../table'
import { createBlockParser } from '../streaming-text/parse'
import { Caret, type StreamStatus } from '../streaming-text/streaming-text'
import { useCompletionAnnouncement } from '../streaming-text/use-completion-announcement'

import { parseMarkdown, type MarkdownBlock, type MarkdownInline } from './parse-markdown'

export interface MarkdownProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The Markdown received so far. Grows; never rewritten from the top. */
  text: string
  /**
   * Where the stream is. `streaming` shows the caret, sets `aria-busy` and
   * closes markers still open at the end; the move from `streaming` to `done`
   * or `error` is announced once. Defaults to `done`.
   */
  status?: StreamStatus
  /** Spoken once when a stream that was running completes. */
  doneAnnouncement?: string
  /** Spoken once when a stream that was running fails. */
  errorAnnouncement?: string
  /**
   * How an inline `[n]` marker renders, usually `citationRenderer(sources)`.
   * Without it the marker stays as text. Pass a stable function (module scope
   * or `useMemo`): finished blocks skip re-rendering only while it stays the same.
   */
  renderCitation?: (n: number) => React.ReactNode
  /**
   * The heading level a `#` becomes; `##` is one deeper, and so on, never past
   * 6. Defaults to 3, for an answer under a page and a section heading. The
   * look follows the depth in the Markdown, not the level, so the same answer
   * looks the same wherever it is placed.
   */
  headingLevel?: 2 | 3 | 4
  /** `muted` for text the reader may skim — reasoning, not the answer. */
  variant?: 'default' | 'muted'
}

/**
 * A model's answer written in Markdown, streamed and rendered in Mola's
 * typography, with its citation markers kept.
 *
 * ── one grammar, three voices ──
 * Paragraphs, lists and quotes are the model talking, so they are Alegreya,
 * as in `StreamingText`. Headings return to the system voice, as in `Prose`:
 * they are wayfinding, not speech. Code is the machine's, a Martian Mono
 * literal, and a fenced block is a `CodeBlock`, so a model's snippet gets the
 * same copy button, wrap toggle and scroll-edge cue as any other code on the
 * page. A table is a Mola `Table`, scanned in Archivo with its frame
 * scrolling sideways at 320px.
 *
 * ── citations survive ──
 * Every consumer that put a Markdown library behind `StreamingText` lost the
 * `[n]` markers: the library read them as text or as broken links. Here they
 * are part of the grammar and go through `renderCitation`, so with
 * `citationRenderer(sources)` each one is a `Citation` with its preview card.
 *
 * ── never HTML ──
 * Nothing the model writes reaches the DOM as markup. The parser produces
 * plain objects that render as React text, so `<script>` in an answer is
 * eleven characters on the screen. A link keeps its href only for http(s),
 * mailto or a relative path; `javascript:` and `data:` links render as their
 * text. An absolute link opens in a new tab and says so, because following
 * a model's link should not end the conversation it came from.
 *
 * ── streaming ──
 * The same machinery as `StreamingText`: finished blocks are parsed once and
 * memoised, the text is `aria-busy` while it streams, and one polite status
 * announces the end. A marker still open at the end of the stream renders
 * closed ("**Star" is already bold), so nothing flashes as asterisks and
 * then restyles; an unclosed fence is a code block that grows.
 */
export function Markdown({
  text,
  status = 'done',
  doneAnnouncement = 'Response complete.',
  errorAnnouncement = 'Response stopped with an error.',
  renderCitation,
  headingLevel = 3,
  variant = 'default',
  className,
  ...props
}: MarkdownProps) {
  const streaming = status === 'streaming'
  // One parser per mounted stream: it holds the settled blocks between chunks.
  const [parse] = React.useState(() => createBlockParser<MarkdownBlock>(parseMarkdown))
  const blocks = React.useMemo(() => parse(text, streaming), [parse, text, streaming])
  const announcement = useCompletionAnnouncement(status, doneAnnouncement, errorAnnouncement)
  const context = React.useMemo(() => ({ renderCitation, headingLevel }), [renderCitation, headingLevel])

  return (
    <div
      data-slot="markdown"
      data-status={status}
      aria-busy={streaming || undefined}
      className={cn(
        'font-text text-lg leading-body [overflow-wrap:anywhere]',
        variant === 'muted' ? 'text-ink-muted' : 'text-ink',
        // One line between blocks, and more above a heading, which starts a section.
        '[&>*+*]:mt-[0.75em] [&>*+:is(h2,h3,h4,h5,h6)]:mt-[1.25em]',
        className,
      )}
      {...props}
    >
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} caret={streaming && i === blocks.length - 1} context={context} />
      ))}
      {blocks.length === 0 && streaming ? (
        <p className="m-0">
          <Caret />
        </p>
      ) : null}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

interface RenderContext {
  renderCitation?: (n: number) => React.ReactNode
  headingLevel: number
}

// The look of a heading by its depth in the Markdown. The first two follow
// Prose's h2 and h3; deeper ones are the label register, as Prose's h4.
const HEADING_CLASS = [
  'font-display text-[1.3em] leading-snug font-bold tracking-heading wdth-display',
  'font-display text-[1.1em] leading-snug font-semibold wdth-display',
  'font-ui rotulo text-ink-2',
]

// Fence tags that CodeBlock knows by another name. Anything else is shown as
// written, as the block's label, and left untokenised.
const LANGUAGES: Record<string, CodeLanguage> = {
  json: 'json',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  shell: 'shell',
  console: 'shell',
  ts: 'ts',
  tsx: 'ts',
  typescript: 'ts',
  py: 'python',
  python: 'python',
  md: 'markdown',
  markdown: 'markdown',
  text: 'text',
  txt: 'text',
}

/**
 * One block, memoised: a settled block's object is reused from chunk to
 * chunk, so all its props are unchanged and it does not render again.
 */
const BlockView = React.memo(function BlockView({
  block,
  caret: showCaret,
  context,
}: {
  block: MarkdownBlock
  caret: boolean
  context: RenderContext
}) {
  const caret = showCaret ? <Caret /> : null
  switch (block.kind) {
    case 'heading': {
      const depth = block.depth - 1
      const Heading = `h${Math.min(6, context.headingLevel + depth)}` as 'h3'
      return (
        <Heading className={cn('m-0 text-ink', HEADING_CLASS[Math.min(2, depth)])}>
          <Inlines inlines={block.inlines} context={context} />
          {caret}
        </Heading>
      )
    }
    case 'p':
      return (
        <p className="m-0">
          <Inlines inlines={block.inlines} context={context} />
          {caret}
        </p>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          className={cn(
            'm-0 ps-[1.4em] marker:text-ink-muted [&_ol]:mt-1 [&_ul]:mt-1',
            block.ordered ? 'list-decimal marker:font-ui marker:tabular marker:text-[0.85em]' : 'list-[square]',
          )}
        >
          {block.items.map((item, j) => (
            <li key={j} className="ps-1 [&+li]:mt-1 [&>*+*]:mt-1">
              {item.map((child, k) => (
                <BlockView
                  key={k}
                  block={child}
                  caret={showCaret && j === block.items.length - 1 && k === item.length - 1}
                  context={context}
                />
              ))}
            </li>
          ))}
        </List>
      )
    }
    case 'quote':
      return (
        <blockquote className="m-0 ps-4 text-ink-2 italic bar-start-keyline [&>*+*]:mt-[0.75em]">
          {block.blocks.map((child, k) => (
            <BlockView key={k} block={child} caret={showCaret && k === block.blocks.length - 1} context={context} />
          ))}
        </blockquote>
      )
    case 'code': {
      const language = LANGUAGES[block.language.toLowerCase()]
      return (
        <CodeBlock
          code={block.text}
          language={language ?? 'text'}
          label={language ? undefined : block.language || undefined}
          className="font-ui not-italic"
        />
      )
    }
    case 'hr':
      return <hr className="my-[1.25em] h-px border-0 bg-keyline" />
    case 'table':
      return (
        <Table className="[&_strong]:font-semibold">
          <TableHeader>
            <TableRow>
              {block.head.map((cell, c) => (
                <TableHead key={c} numeric={block.align[c] === 'end'} className={cn(block.align[c] === 'center' && 'text-center')}>
                  <Inlines inlines={cell} context={context} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, r) => (
              <TableRow key={r}>
                {row.map((cell, c) => (
                  <TableCell key={c} numeric={block.align[c] === 'end'} className={cn(block.align[c] === 'center' && 'text-center')}>
                    <Inlines inlines={cell} context={context} />
                    {showCaret && r === block.rows.length - 1 && c === row.length - 1 ? <Caret /> : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
  }
})

const isExternal = (href: string) => /^(https?:)?\/\//i.test(href)

function Inlines({ inlines, context }: { inlines: MarkdownInline[]; context: RenderContext }) {
  return inlines.map((inline, i) => {
    switch (inline.kind) {
      case 'text':
        return <React.Fragment key={i}>{inline.text}</React.Fragment>
      case 'break':
        return <br key={i} />
      case 'code':
        return (
          <code key={i} className="literal bg-ink-soft px-[0.3em] py-[0.1em] text-[0.82em] text-ink not-italic">
            {inline.text}
          </code>
        )
      case 'strong':
        return (
          <strong key={i} className="font-bold">
            <Inlines inlines={inline.children} context={context} />
          </strong>
        )
      case 'em':
        return (
          <em key={i} className="italic">
            <Inlines inlines={inline.children} context={context} />
          </em>
        )
      case 'del':
        return (
          <del key={i} className="line-through decoration-ink-muted">
            <Inlines inlines={inline.children} context={context} />
          </del>
        )
      case 'link': {
        const external = isExternal(inline.href)
        return (
          <a
            key={i}
            href={inline.href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-ink underline decoration-ink-muted underline-offset-2 hover:decoration-current focus-visible:focus-ring focus-visible:outline-none"
          >
            <Inlines inlines={inline.children} context={context} />
            {/* The space is inside the hidden span, so the underline does not
                run on past the last word. */}
            {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </a>
        )
      }
      case 'cite':
        return (
          <React.Fragment key={i}>{context.renderCitation ? context.renderCitation(inline.n) : `[${inline.n}]`}</React.Fragment>
        )
    }
  })
}
