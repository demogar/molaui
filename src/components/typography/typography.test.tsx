import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Display } from './display'
import { Heading } from './heading'
import { KbdChord } from './kbd'
import { Pullquote } from './pullquote'
import { Text } from './text'

describe('Heading', () => {
  it('renders the element its level names', () => {
    render(<Heading level={3}>Arguments</Heading>)
    expect(screen.getByRole('heading', { level: 3, name: 'Arguments' })).toBeInTheDocument()
  })

  it('lets size differ from the outline level', () => {
    render(
      <Heading level={2} size={4}>
        Dialog title
      </Heading>,
    )
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.className).toContain('text-base')
    expect(heading.className).not.toContain('text-xl')
  })
})

describe('Display', () => {
  it('puts its leading back when a bare size override strips it', () => {
    render(<Display className="text-[40px]">Title</Display>)
    expect(screen.getByRole('heading').className).toContain('leading-[1.02]')
  })

  it('respects a leading the caller sets', () => {
    render(<Display className="text-[40px] leading-none">Title</Display>)
    const cls = screen.getByRole('heading').className
    expect(cls).toContain('leading-none')
    expect(cls).not.toContain('leading-[1.02]')
  })
})

describe('Text', () => {
  it('only renders the elements it allows', () => {
    render(<Text as="span">inline</Text>)
    expect(screen.getByText('inline').tagName).toBe('SPAN')
  })
})

describe('KbdChord', () => {
  it('nests each key inside one outer kbd, as the HTML spec describes a chord', () => {
    const { container } = render(<KbdChord keys={['⌘', 'K']} />)
    const outer = container.firstElementChild!
    expect(outer.tagName).toBe('KBD')
    expect(outer.querySelectorAll('kbd')).toHaveLength(2)
  })
})

describe('Pullquote', () => {
  it('keeps the attribution outside the quotation', () => {
    const { container } = render(<Pullquote cite="Interview 7">Quoted words</Pullquote>)
    expect(container.querySelector('blockquote')).not.toHaveTextContent('Interview 7')
    expect(container.querySelector('figcaption')).toHaveTextContent('Interview 7')
  })
})
