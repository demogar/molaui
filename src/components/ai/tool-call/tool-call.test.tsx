import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ToolCall } from './tool-call'

describe('ToolCall', () => {
  it('shows the tool name as a literal and its status in words', () => {
    render(<ToolCall name="query_experiment" status="succeeded" durationMs={1840} />)
    expect(screen.getByText('query_experiment')).toHaveClass('literal')
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('1.8s')).toBeInTheDocument()
  })

  it('is collapsed by default and opens on demand', async () => {
    render(<ToolCall name="q" status="succeeded" args={{ id: 'exp-0412' }} />)
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

  it('holds for approval with equal Approve and Deny', async () => {
    const onApprove = vi.fn()
    const onDeny = vi.fn()
    render(
      <ToolCall name="update_flag" status="waiting" approval={{ reason: 'Writes to production.', onApprove, onDeny }} />,
    )
    expect(screen.getByText('Writes to production.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Deny' }))
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onDeny).toHaveBeenCalledOnce()
    expect(onApprove).toHaveBeenCalledOnce()
  })
})
