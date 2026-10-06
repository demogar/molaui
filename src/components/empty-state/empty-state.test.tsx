import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders its title as a heading at the requested level', () => {
    render(<EmptyState title="No runs" headingLevel={2} />)
    expect(screen.getByRole('heading', { level: 2, name: 'No runs' })).toBeInTheDocument()
  })

  it('announces the error variant', () => {
    render(<EmptyState variant="error" title="Did not load" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Did not load')
  })

  it('does not announce an ordinary empty panel', () => {
    render(<EmptyState title="Nothing yet" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
