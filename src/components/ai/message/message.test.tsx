import { fireEvent, render, screen } from '@/test/render'
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

  it('reaches every action with Tab and activates them with Enter or Space', async () => {
    const onRetry = vi.fn()
    const onFeedback = vi.fn()
    render(
      <Message role="assistant" author="Cayuco" onRetry={onRetry} onFeedback={onFeedback}>
        The Starter cohort dropped.
      </Message>,
    )
    // The actions are visually hidden until hover or focus, but stay in the tab order.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onRetry).toHaveBeenCalledOnce()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Good response' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(onFeedback).toHaveBeenLastCalledWith('up')
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Bad response' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onFeedback).toHaveBeenLastCalledWith('down')
  })

  it('activates Retry on a failed message from the keyboard', async () => {
    const onRetry = vi.fn()
    render(
      <Message role="assistant" status="error" error="upstream_timeout (req_1)" onRetry={onRetry}>
        Partial answer
      </Message>,
    )
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(onRetry).toHaveBeenCalledOnce()
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

  it('stops on the transcript itself, and leaves the scrolling keys to the browser', async () => {
    render(
      <Thread label="Conversation">
        <p>turn</p>
      </Thread>,
    )
    const transcript = screen.getByLabelText('Conversation transcript')
    await userEvent.tab()
    expect(transcript).toHaveFocus()
    // jsdom does not scroll, so what is checked is the part the component
    // owns: the keys reach the focused transcript and nothing cancels them,
    // which is what lets the browser scroll it.
    const prevented: string[] = []
    const record = (event: KeyboardEvent) => {
      if (event.defaultPrevented) prevented.push(event.key)
    }
    window.addEventListener('keydown', record)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowUp}')
    await userEvent.keyboard('{PageDown}')
    await userEvent.keyboard('{PageUp}')
    window.removeEventListener('keydown', record)
    expect(prevented).toEqual([])
    expect(transcript).toHaveFocus()
  })

  it('offers Jump to latest once the reader scrolls away, and Enter returns to the bottom', async () => {
    render(
      <Thread label="Conversation">
        <p>turn</p>
      </Thread>,
    )
    const transcript = screen.getByLabelText('Conversation transcript')
    const scrollTo = vi.fn()
    transcript.scrollTo = scrollTo
    Object.defineProperty(transcript, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(transcript, 'clientHeight', { configurable: true, value: 400 })
    transcript.scrollTop = 200
    fireEvent.scroll(transcript)
    const jump = await screen.findByRole('button', { name: 'Jump to latest' })
    jump.focus()
    await userEvent.keyboard('{Enter}')
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'smooth' })
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument()
  })
})
