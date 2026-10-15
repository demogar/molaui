import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ToolCall } from './tool-call'

describe('ToolCall', () => {
  it('shows the tool name as a literal and its status in words', () => {
    render(<ToolCall name="query_rollout" status="succeeded" durationMs={1840} />)
    expect(screen.getByText('query_rollout')).toHaveClass('literal')
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('1.8s')).toBeInTheDocument()
  })

  it('is collapsed by default and opens on demand', async () => {
    render(<ToolCall name="q" status="succeeded" args={{ id: 'ro-0412' }} />)
    const trigger = screen.getByRole('button', { name: /q/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens itself on failure, with the error verbatim and a retry', async () => {
    const onRetry = vi.fn()
    render(<ToolCall name="q" status="failed" error="PermissionDenied: nope" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('PermissionDenied: nope')
    await userEvent.click(screen.getByRole('button', { name: 'Retry call' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  // The header was `disabled` while forced open, so Tab skipped the call's
  // name and status and landed on Retry or Approve.
  it.each([
    ['failed', {}],
    ['waiting', { approval: { reason: 'Writes to production.', onApprove: () => {}, onDeny: () => {} } }],
  ] as const)('keeps the header a tab stop while %s holds it open', async (status, extra) => {
    const user = userEvent.setup()
    render(<ToolCall name="update_flag" status={status} error="PermissionDenied" {...extra} />)
    await user.tab()
    const header = screen.getByRole('button', { name: /update_flag/ })
    expect(header).toHaveFocus()
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(header).toHaveAttribute('aria-disabled', 'true')
    // It does not close.
    await user.keyboard('{Enter}')
    expect(header).toHaveAttribute('aria-expanded', 'true')
  })

  it('holds for approval with equal Approve and Deny', async () => {
    const onApprove = vi.fn()
    const onDeny = vi.fn()
    render(
      <ToolCall name="update_flag" status="waiting" approval={{ reason: 'Writes to production.', onApprove, onDeny }} />,
    )
    expect(screen.getByText('Writes to production.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' }).className).toBe(screen.getByRole('button', { name: 'Deny' }).className)
    await userEvent.click(screen.getByRole('button', { name: 'Deny' }))
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onDeny).toHaveBeenCalledOnce()
    expect(onApprove).toHaveBeenCalledOnce()
  })

  it('opens from its header with Enter or Space, then tabs into the payload, whose block scrolls with the arrows', async () => {
    render(<ToolCall name="query_rollout" status="succeeded" args={{ id: 'ro-0412' }} />)
    const header = screen.getByRole('button', { name: /query_rollout/ })
    await userEvent.tab()
    expect(header).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(header).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard(' ')
    expect(header).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard(' ')
    expect(header).toHaveAttribute('aria-expanded', 'true')

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Wrap lines' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toHaveFocus()
    await userEvent.tab()
    const block = document.activeElement as HTMLElement
    expect(block.tagName).toBe('PRE')
    expect(block).toHaveAccessibleName('arguments')
    // jsdom does not scroll; what the component owns is that the block takes
    // focus and nothing cancels the arrow keys, so the browser scrolls it.
    const prevented: string[] = []
    const record = (event: KeyboardEvent) => {
      if (event.defaultPrevented) prevented.push(event.key)
    }
    window.addEventListener('keydown', record)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowUp}')
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.keyboard('{ArrowLeft}')
    window.removeEventListener('keydown', record)
    expect(prevented).toEqual([])
    expect(block).toHaveFocus()
  })

  it('reaches Approve and Deny with Tab and decides with Enter or Space', async () => {
    const onApprove = vi.fn()
    const onDeny = vi.fn()
    render(
      <ToolCall name="update_flag" status="waiting" approval={{ reason: 'Writes to production.', onApprove, onDeny }} />,
    )
    // The held-open header is the first stop, then the decision.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: /update_flag/ })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onApprove).toHaveBeenCalledOnce()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Deny' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(onDeny).toHaveBeenCalledOnce()
  })
})
