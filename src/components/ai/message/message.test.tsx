import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Message } from './message'
import { Thread } from './thread'

describe('Message', () => {
  it('is an article named by its speaker', () => {
    render(
      <Message role="assistant" author="Cayuco">
        Hi
      </Message>,
    )
    expect(screen.getByRole('article', { name: 'Cayuco' })).toBeInTheDocument()
  })

  it('states a failure, shows the error verbatim and offers retry', async () => {
    const onRetry = vi.fn()
    render(
      <Message role="assistant" status="error" error="upstream_timeout (req_1)" onRetry={onRetry}>
        Partial answer
      </Message>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('upstream_timeout (req_1)')
    expect(screen.getByText('Partial answer')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('hides actions while streaming, then offers rating as toggle buttons', () => {
    const { rerender } = render(
      <Message role="assistant" status="streaming" onFeedback={vi.fn()}>
        …
      </Message>,
    )
    expect(screen.queryByRole('button', { name: 'Good response' })).not.toBeInTheDocument()
    rerender(
      <Message role="assistant" status="done" onFeedback={vi.fn()} feedback="up">
        Done
      </Message>,
    )
    expect(screen.getByRole('button', { name: 'Good response' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Thread', () => {
  it('is a labelled region and not a live region', () => {
    render(
      <Thread label="Conversation">
        <p>turn</p>
      </Thread>,
    )
    const region = screen.getByRole('region', { name: 'Conversation' })
    expect(region).not.toHaveAttribute('aria-live')
    expect(region.querySelector('[role="log"]')).toBeNull()
  })
})
