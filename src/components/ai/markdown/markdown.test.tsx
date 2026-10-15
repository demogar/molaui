import { render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MARKDOWN_ANSWER, SOURCES } from '../_story-data/fixtures'
import { tokenize } from '../_story-data/simulate'
import { citationRenderer } from '../sources'
import { createBlockParser } from '../streaming-text/parse'
import { Markdown } from './markdown'
import { parseInlines, parseMarkdown, safeHref } from './parse-markdown'

describe('parseMarkdown: blocks', () => {
  it('reads headings, paragraphs, lists, quotes, rules, fences and tables', () => {
    const blocks = parseMarkdown(MARKDOWN_ANSWER)
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'p', 'heading', 'table', 'list', 'quote', 'code', 'p'])
  })

  it('nests a list by indentation and keeps a numbered list’s start', () => {
    const [list] = parseMarkdown('3. one\n4. two\n   - inner a\n   - inner b')
    expect(list).toMatchObject({ kind: 'list', ordered: true, start: 3 })
    if (list?.kind !== 'list') throw new Error('not a list')
    expect(list.items).toHaveLength(2)
    expect(list.items[1]!.map((b) => b.kind)).toEqual(['p', 'list'])
  })

  it('lets a list or a heading start right under a paragraph line, as models write them', () => {
    expect(parseMarkdown('Results:\n- a\n- b').map((b) => b.kind)).toEqual(['p', 'list'])
    expect(parseMarkdown('Intro\n## Next').map((b) => b.kind)).toEqual(['p', 'heading'])
  })

  it('reads table alignment and pads short rows', () => {
    const [table] = parseMarkdown('| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 |')
    expect(table).toMatchObject({ kind: 'table', align: ['start', 'center', 'end'] })
    if (table?.kind !== 'table') throw new Error('not a table')
    expect(table.rows[0]).toHaveLength(3)
  })

  it('keeps the fence’s language and its blank lines', () => {
    expect(parseMarkdown('```sql\nselect 1\n\nfrom t\n```')).toEqual([{ kind: 'code', language: 'sql', text: 'select 1\n\nfrom t' }])
  })
})

describe('parseInlines', () => {
  it('reads code, strong, emphasis, deletion, links, citations and breaks', () => {
    expect(parseInlines('`a` **b** *c* ~~d~~ [e](https://example.com) [2] f  \ng')).toEqual([
      { kind: 'code', text: 'a' },
      { kind: 'text', text: ' ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'b' }] },
      { kind: 'text', text: ' ' },
      { kind: 'em', children: [{ kind: 'text', text: 'c' }] },
      { kind: 'text', text: ' ' },
      { kind: 'del', children: [{ kind: 'text', text: 'd' }] },
      { kind: 'text', text: ' ' },
      { kind: 'link', href: 'https://example.com', children: [{ kind: 'text', text: 'e' }] },
      { kind: 'text', text: ' ' },
      { kind: 'cite', n: 2 },
      { kind: 'text', text: ' f' },
      { kind: 'break' },
      { kind: 'text', text: 'g' },
    ])
  })

  it('leaves snake_case, arithmetic and escaped markers as text', () => {
    expect(parseInlines('time_to_first_reply_s')).toEqual([{ kind: 'text', text: 'time_to_first_reply_s' }])
    expect(parseInlines('5 * 3 * 2')).toEqual([{ kind: 'text', text: '5 * 3 * 2' }])
    expect(parseInlines('\\*not em\\*')).toEqual([{ kind: 'text', text: '*not em*' }])
  })

  it('reads ***both*** as emphasis inside strong', () => {
    expect(parseInlines('***x***')).toEqual([{ kind: 'strong', children: [{ kind: 'em', children: [{ kind: 'text', text: 'x' }] }] }])
  })

  it('shows unclosed markers as characters once the text is complete', () => {
    expect(parseInlines('a **b')).toEqual([{ kind: 'text', text: 'a **b' }])
  })
})

describe('parsing a stream that is still arriving', () => {
  it('closes an open marker at the end, so nothing flashes as asterisks', () => {
    expect(parseInlines('a **Sta', true)).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'Sta' }] },
    ])
    expect(parseInlines('run `ro_04', true)).toEqual([
      { kind: 'text', text: 'run ' },
      { kind: 'code', text: 'ro_04' },
    ])
  })

  it('holds back a citation or a link that has not finished arriving', () => {
    expect(parseInlines('Fact [1', true)).toEqual([{ kind: 'text', text: 'Fact ' }])
    expect(parseInlines('See [the results](https://exa', true)).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'text', text: 'the results' },
    ])
  })

  it('holds back a bare # and keeps an unclosed fence as code', () => {
    expect(parseMarkdown('Intro.\n\n##', true)).toEqual([{ kind: 'p', inlines: [{ kind: 'text', text: 'Intro.' }] }])
    expect(parseMarkdown('Look:\n\n```sql\nselect', true).at(-1)).toEqual({ kind: 'code', language: 'sql', text: 'select' })
    expect(parseMarkdown('```py', true)).toEqual([{ kind: 'code', language: '', text: '' }])
  })

  it('never throws on any prefix, and ends exactly where a one-shot parse does', () => {
    const tokens = tokenize(MARKDOWN_ANSWER)
    const parse = createBlockParser(parseMarkdown)
    let text = ''
    for (const token of tokens) {
      text += token
      expect(() => parse(text, true)).not.toThrow()
    }
    expect(parse(text, false)).toEqual(parseMarkdown(MARKDOWN_ANSWER))
  })
})

describe('safeHref', () => {
  it('keeps http(s), mailto, relative paths and fragments', () => {
    for (const href of ['https://example.com/a', 'http://example.com', 'mailto:ops@example.com', '/runs/1', '#source-2', 'notes.md']) {
      expect(safeHref(href)).toBe(href)
    }
  })

  it('drops every other scheme, even with whitespace hidden in it', () => {
    for (const href of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x', ' ']) {
      expect(safeHref(href)).toBeUndefined()
    }
  })
})

describe('Markdown', () => {
  it('never turns model text into markup', () => {
    const { container } = render(<Markdown text={'<img src=x onerror="alert(1)"> and <script>alert(1)</script>'} />)
    expect(container.querySelector('img, script')).toBeNull()
    expect(container).toHaveTextContent('<img src=x onerror="alert(1)"> and <script>alert(1)</script>')
  })

  it('renders an unsafe link as its words, with no href', () => {
    render(<Markdown text="[Open the report](javascript:alert(1))" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Open the report')).toBeInTheDocument()
  })

  it('opens an absolute link in a new tab and says so', () => {
    render(<Markdown text="See [the results](https://example.com/r) and [the notes](#notes)." />)
    const external = screen.getByRole('link', { name: /^the results ?\(opens in a new tab\)$/ })
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'the notes' })).not.toHaveAttribute('target')
  })

  it('keeps citation markers as Citations named by their source', () => {
    render(<Markdown text="Tickets fell [1]." renderCitation={citationRenderer(SOURCES)} />)
    expect(screen.getByRole('link', { name: `Source 1: ${SOURCES[0].title}` })).toHaveAttribute('href', '#source-1')
  })

  it('leaves a marker as text without renderCitation', () => {
    const { container } = render(<Markdown text="Tickets fell [1]." />)
    expect(container).toHaveTextContent('Tickets fell [1].')
  })

  it('maps # to headingLevel and each extra # one deeper', () => {
    const { rerender } = render(<Markdown text={'# One\n\n## Two'} />)
    expect(screen.getByRole('heading', { name: 'One', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two', level: 4 })).toBeInTheDocument()
    rerender(<Markdown key="2" text={'# One\n\n## Two'} headingLevel={2} />)
    expect(screen.getByRole('heading', { name: 'One', level: 2 })).toBeInTheDocument()
  })

  it('renders a fence as a CodeBlock and a table as a Table', () => {
    render(<Markdown text={MARKDOWN_ANSWER} />)
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Metric', 'Control', 'Help panel'])
  })

  it('shows a caret and is busy while streaming, and announces the end once', () => {
    const { container, rerender } = render(<Markdown text="**Sta" status="streaming" />)
    expect(container.querySelector('[data-slot="caret"]')).toBeInTheDocument()
    expect(container.querySelector('strong')).toHaveTextContent('Sta')
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('')
    rerender(<Markdown text="**Starter**" status="done" />)
    expect(screen.getByRole('status')).toHaveTextContent('Response complete.')
    expect(container.firstChild).not.toHaveAttribute('aria-busy')
  })

  it('moves focus through its links and citations with Tab', async () => {
    const user = userEvent.setup()
    render(<Markdown text="Fell [1], see [notes](#notes)." renderCitation={citationRenderer(SOURCES)} />)
    await user.tab()
    expect(screen.getByRole('link', { name: `Source 1: ${SOURCES[0].title}` })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'notes' })).toHaveFocus()
  })
})
