import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createBlockParser, parseBlocks } from './parse'
import { StreamingText } from './streaming-text'

describe('parseBlocks', () => {
  it('splits paragraphs and bullet lists', () => {
    const blocks = parseBlocks('One.\n\n- a\n- b\n\nTwo.')
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'ul', 'p'])
  })

  it('keeps an unclosed fence as code, which is the normal state mid-stream', () => {
    const blocks = parseBlocks('Look:\n\n```sql\nselect 1\n\nfrom t')
    expect(blocks.at(-1)).toEqual({ kind: 'pre', text: 'select 1\n\nfrom t' })
  })

  it('treats an opening fence still waiting for its newline as code, wherever it falls', () => {
    expect(parseBlocks('```').at(-1)).toEqual({ kind: 'pre', text: '' })
    expect(parseBlocks('Look:\n\n```sq').at(-1)).toEqual({ kind: 'pre', text: '' })
  })

  it('renders a half-arrived **strong as plain text instead of throwing', () => {
    expect(() => parseBlocks('This is **bol')).not.toThrow()
  })
})

describe('StreamingText', () => {
  it('shows a caret and is busy while streaming', () => {
    const { container } = render(<StreamingText text="Hello" status="streaming" />)
    expect(container.querySelector('[data-slot="caret"]')).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true')
  })

  it('announces completion once, when a running stream ends', () => {
    const { rerender } = render(<StreamingText text="Hel" status="streaming" />)
    expect(screen.getByRole('status')).toHaveTextContent('')
    rerender(<StreamingText text="Hello." status="done" />)
    expect(screen.getByRole('status')).toHaveTextContent('Response complete.')
  })

  it('does not announce text that was already complete on mount', () => {
    render(<StreamingText text="Hello." status="done" />)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('hands [n] markers to renderCitation', () => {
    render(<StreamingText text="Fact [2]." renderCitation={(n) => <a href={`#s${n}`}>source {n}</a>} />)
    expect(screen.getByRole('link', { name: 'source 2' })).toBeInTheDocument()
  })
})

// Everything the grammar has, and the cases that could move a boundary: a
// blank line inside a fence, a fence closed mid-line, a ``` with no newline
// after it yet, runs of three newlines, a list, a citation split mid-token.
const TRICKY = [
  'The help panel **cut** tickets [1].',
  '- one\n- two `code`\n- three',
  '```sql\nselect 1\n\n\nfrom t\n```',
  'After the fence, same line? No: next paragraph [2].\n\n\n',
  'Inline ```not a fence``` until a newline arrives',
  '```\n```after',
  'Last words [3]',
].join('\n\n')

describe('createBlockParser', () => {
  it('gives exactly what parseBlocks gives, at every prefix of a stream', () => {
    const parse = createBlockParser()
    for (let i = 0; i <= TRICKY.length; i++) {
      const prefix = TRICKY.slice(0, i)
      expect(parse(prefix), `at ${i}: ${JSON.stringify(prefix.slice(-12))}`).toEqual(parseBlocks(prefix))
    }
  })

  it('starts again when the text is rewritten rather than appended to', () => {
    const parse = createBlockParser()
    parse('First.\n\nSecond.')
    expect(parse('Other.\n\nThing.')).toEqual(parseBlocks('Other.\n\nThing.'))
  })

  // Counting characters parsed, not milliseconds, so the guard cannot flake.
  // Re-parsing from the top costs the sum of every prefix — quadratic; the
  // settled cache costs about one paragraph per chunk.
  it('parses each chunk at the cost of the block still arriving, not the whole answer', () => {
    const paragraph = 'The drop is concentrated in Starter [2], and the guardrail moved the wrong way. '.repeat(3)
    const full = Array.from({ length: 200 }, () => paragraph.trim()).join('\n\n')
    let parsed = 0
    const parse = createBlockParser((text) => {
      parsed += text.length
      return parseBlocks(text)
    })
    for (let i = 8; i < full.length + 8; i += 8) parse(full.slice(0, i))
    const chunks = Math.ceil(full.length / 8)
    expect(parsed).toBeLessThan(chunks * paragraph.length)
    expect(parsed).toBeLessThan(full.length * 40)
  })
})

describe('StreamingText while a long answer streams', () => {
  it('re-renders only the block still arriving', () => {
    const paragraphs = Array.from({ length: 60 }, (_, i) => `Paragraph ${i} cites a source [1] and keeps going.`)
    const full = paragraphs.join('\n\n')
    const cite = vi.fn((n: number) => <sup>{n}</sup>)
    const { rerender } = render(<StreamingText text="" status="streaming" renderCitation={cite} />)
    for (let i = 6; i < full.length + 6; i += 6) {
      rerender(<StreamingText text={full.slice(0, i)} status="streaming" renderCitation={cite} />)
    }
    // Each citation renders while its paragraph is the tail, plus once when it
    // settles. Re-rendering every finished block on every chunk made this
    // grow with the square of the answer: about 60 times higher here.
    const chunks = Math.ceil(full.length / 6)
    expect(cite.mock.calls.length).toBeLessThan(chunks + paragraphs.length * 2)
    expect(screen.getAllByText('1')).toHaveLength(60)
  })
})
