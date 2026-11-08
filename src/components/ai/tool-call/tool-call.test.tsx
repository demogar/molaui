import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import * as React from 'react'

import { ToolCall, type ToolCallArgs, type ToolCallDecision } from './tool-call'

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

  describe('approved with edits', () => {
    const ARGS = { charge: 'ch_31b0', amount_usd: 240 }

    // The page owns the decision, as it would in an app: the handlers record
    // it and move the call on.
    function Refund({ validate }: { validate?: (draft: ToolCallArgs) => string | null }) {
      const [decision, setDecision] = React.useState<ToolCallDecision | null>(null)
      return (
        <ToolCall
          name="billing.issue_refund"
          status={decision ? 'running' : 'waiting'}
          args={ARGS}
          decision={decision}
          approval={{
            reason: 'It moves money.',
            onApprove: () => setDecision({ status: 'approved', by: 'M. Herrera' }),
            onDeny: () => setDecision({ status: 'denied', by: 'M. Herrera' }),
            edit: {
              ...(validate ? { validate } : {}),
              render: (draft, setDraft) => (
                <label>
                  Amount
                  <input
                    type="number"
                    value={String(draft.amount_usd)}
                    onChange={(event) => setDraft({ ...draft, amount_usd: Number(event.target.value) })}
                  />
                </label>
              ),
              onApprove: (edited) => setDecision({ status: 'approved_with_edits', by: 'M. Herrera', editedArgs: edited }),
            },
          }}
        />
      )
    }

    it('offers Edit and approve beside Approve and Deny, moves focus into the fields and back on cancel', async () => {
      const user = userEvent.setup()
      render(<Refund />)
      const edit = screen.getByRole('button', { name: 'Edit and approve' })
      await user.click(edit)
      expect(screen.getByRole('spinbutton', { name: 'Amount' })).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Cancel edits' }))
      expect(screen.getByRole('button', { name: 'Edit and approve' })).toHaveFocus()
    })

    it('does not offer Approve with edits until an argument changes, and says why', async () => {
      const user = userEvent.setup()
      render(<Refund />)
      await user.click(screen.getByRole('button', { name: 'Edit and approve' }))
      const approve = screen.getByRole('button', { name: 'Approve with edits' })
      expect(approve).toBeDisabled()
      expect(approve).toHaveAccessibleDescription(/Nothing has changed yet/)
    })

    it('holds an invalid edit back with the schema’s reason in words', async () => {
      const user = userEvent.setup()
      render(<Refund validate={(draft) => (Number(draft.amount_usd) > 240 ? 'The refund can be at most 240.' : null)} />)
      await user.click(screen.getByRole('button', { name: 'Edit and approve' }))
      const amount = screen.getByRole('spinbutton', { name: 'Amount' })
      await user.clear(amount)
      await user.type(amount, '500')
      const approve = screen.getByRole('button', { name: 'Approve with edits' })
      expect(approve).toBeDisabled()
      expect(approve).toHaveAccessibleDescription('Can’t approve yet: The refund can be at most 240.')
      await user.clear(amount)
      await user.type(amount, '120')
      expect(approve).toBeEnabled()
    })

    it('records its own decision with each change, and says it as one sentence where focus lands', async () => {
      const user = userEvent.setup()
      render(<Refund />)
      await user.click(screen.getByRole('button', { name: 'Edit and approve' }))
      const amount = screen.getByRole('spinbutton', { name: 'Amount' })
      await user.clear(amount)
      await user.type(amount, '120')
      await user.click(screen.getByRole('button', { name: 'Approve with edits' }))
      const outcome = screen.getByRole('group', {
        name: 'Approved with edits by M. Herrera: amount_usd changed from 240 to 120.',
      })
      expect(outcome).toHaveFocus()
      expect(outcome).toHaveTextContent('Approved with edits')
      expect(outcome).toHaveTextContent('amount_usd')
      expect(screen.queryByRole('button', { name: 'Approve with edits' })).not.toBeInTheDocument()
    })

    it('keeps a plain approval distinct from an edited one', async () => {
      const user = userEvent.setup()
      render(<Refund />)
      await user.click(screen.getByRole('button', { name: 'Approve' }))
      expect(screen.getByRole('group', { name: 'Approved by M. Herrera' })).toHaveFocus()
      expect(screen.queryByText('Approved with edits')).not.toBeInTheDocument()
    })

    it('does not take focus for a call that loads already decided', () => {
      render(
        <ToolCall
          name="billing.issue_refund"
          status="succeeded"
          args={ARGS}
          decision={{ status: 'approved_with_edits', editedArgs: { ...ARGS, amount_usd: 120 } }}
        />,
      )
      expect(screen.getByRole('group', { name: 'Approved with edits: amount_usd changed from 240 to 120.' })).not.toHaveFocus()
    })
  })
})
