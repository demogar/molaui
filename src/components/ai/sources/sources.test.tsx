import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Citation, SourceList } from './sources'

describe('Citation', () => {
  it('is named by the source title and links to its card', () => {
    render(<Citation n={2} title="Segment breakdown" />)
    const link = screen.getByRole('link', { name: 'Source 2: Segment breakdown' })
    expect(link).toHaveAttribute('href', '#source-2')
  })
})

describe('SourceList', () => {
  it('gives each card the id the citation points at', () => {
    const { container } = render(
      <SourceList sources={[{ id: 2, title: 'T', href: 'https://example.com', domain: 'example.com' }]} />,
    )
    expect(container.querySelector('#source-2')).toBeInTheDocument()
  })
})
