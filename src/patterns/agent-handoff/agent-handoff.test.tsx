import { render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AgentHandoffScreen } from './agent-handoff'

const handoffHeading = () => screen.getAllByRole('heading', { level: 2 })[0]!

describe('AgentHandoffScreen', () => {
  it('while loading, says so once, keeps the shape and offers nothing to press', () => {
    const { container } = render(<AgentHandoffScreen loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading the hand-off')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Take over' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve refund' })).not.toBeInTheDocument()
  })

  it('leads with what the agent needs and why, and nothing is sent yet', () => {
    render(<AgentHandoffScreen />)
    expect(handoffHeading()).toHaveTextContent('The agent needs your approval')
    expect(screen.getByText(/over the \$100.00 I can refund on my own/)).toBeInTheDocument()
    expect(screen.getByText('High confidence')).toBeInTheDocument()
    expect(screen.getByText('Draft, not sent')).toBeInTheDocument()
    // Approve and Deny, and Take over in the header: three ways out, all visible.
    expect(screen.getByRole('button', { name: 'Approve refund' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take over' })).toBeInTheDocument()
  })

  it('approve from the keyboard: focus follows to the heading, and the outcome is announced', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const refund = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    render(<AgentHandoffScreen refund={refund} />)
    screen.getByRole('button', { name: 'Approve refund' }).focus()
    await user.keyboard('{Enter}')
    expect(refund).toHaveBeenCalledOnce()
    expect(handoffHeading()).toHaveTextContent('Issuing the refund')
    expect(handoffHeading()).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Take over' })).not.toBeInTheDocument()

    finish()
    await waitFor(() => expect(handoffHeading()).toHaveTextContent('Refund issued and reply sent'))
    expect(screen.getByText('Refund issued and reply sent.', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(screen.getByText('Sent')).toBeInTheDocument()
  })

  it('a failed refund says so verbatim, sends nothing, and Retry call tries again', async () => {
    const user = userEvent.setup()
    const refund = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('BillingUnavailable: upstream timed out after 10s'))
      .mockResolvedValueOnce()
    render(<AgentHandoffScreen refund={refund} />)
    await user.click(screen.getByRole('button', { name: 'Approve refund' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('BillingUnavailable: upstream timed out after 10s')
    expect(handoffHeading()).toHaveTextContent('The refund didn’t go through')
    expect(screen.getByText('Draft, not sent')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take over' })).toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Retry call' }))
    await waitFor(() => expect(handoffHeading()).toHaveTextContent('Refund issued and reply sent'))
    expect(refund).toHaveBeenCalledTimes(2)
  })

  it('take over stops the agent and hands the person the draft to send as themselves', async () => {
    const user = userEvent.setup()
    const onSendReply = vi.fn()
    render(<AgentHandoffScreen onSendReply={onSendReply} />)
    await user.click(screen.getByRole('button', { name: 'Take over' }))
    expect(handoffHeading()).toHaveTextContent('You have this ticket')
    expect(handoffHeading()).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Approve refund' })).not.toBeInTheDocument()
    const reply = screen.getByRole('textbox', { name: 'Your reply' })
    expect((reply as HTMLTextAreaElement).value).toContain('I have refunded the second charge')

    await user.clear(reply)
    await user.type(reply, 'Hi Tomás, our billing team is looking at it today.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(onSendReply).toHaveBeenCalledWith('Hi Tomás, our billing team is looking at it today.')
  })

  it('deny is a take-over: the refund is refused and the ticket is the person’s', async () => {
    const user = userEvent.setup()
    const refund = vi.fn(() => Promise.resolve())
    render(<AgentHandoffScreen refund={refund} />)
    await user.click(screen.getByRole('button', { name: 'Deny' }))
    expect(refund).not.toHaveBeenCalled()
    expect(handoffHeading()).toHaveFocus()
    expect(screen.getByText('Refund denied. You have this ticket; nothing was sent.', { selector: '[role="status"]' })).toBeInTheDocument()
  })

  it('without permission to approve: no Approve, who can, and Take over still there', async () => {
    const user = userEvent.setup()
    const onReassign = vi.fn()
    render(<AgentHandoffScreen canApprove={false} onReassign={onReassign} />)
    expect(screen.queryByRole('button', { name: 'Approve refund' })).not.toBeInTheDocument()
    const callout = screen.getByRole('region', { name: 'Refunds over $100.00 need a billing lead' })
    expect(callout).toHaveTextContent('Kai Morales or Ana Ruiz can approve it')
    await user.click(within(callout).getByRole('button', { name: 'Reassign to billing' }))
    expect(onReassign).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Take over' })).toBeInTheDocument()
  })

  it('with nothing waiting, says what will appear here', () => {
    render(<AgentHandoffScreen handoff={null} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing needs you' })).toBeInTheDocument()
  })
})
