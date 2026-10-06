import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Callout } from './callout'

describe('Callout', () => {
  it('is a region named by its title', () => {
    render(<Callout title="Budget at 86%">Body</Callout>)
    expect(screen.getByRole('region', { name: 'Budget at 86%' })).toHaveTextContent('Body')
  })

  it('is not a landmark when it has no title', () => {
    render(<Callout>Just a note</Callout>)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('renders a dismiss button only when dismissible', async () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<Callout title="x" />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    rerender(<Callout title="x" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
