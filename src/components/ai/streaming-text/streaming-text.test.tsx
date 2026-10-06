import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { parseBlocks } from './parse'
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
