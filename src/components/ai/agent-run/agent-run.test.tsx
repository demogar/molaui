import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AgentRun, type AgentStep } from './agent-run'

const steps: AgentStep[] = [
  { id: 'a', kind: 'reasoning', title: 'Plan', status: 'succeeded', durationMs: 2400 },
  { id: 'b', kind: 'tool', title: 'Query', status: 'running', startedAt: Date.now() },
  { id: 'c', kind: 'message', title: 'Answer', status: 'queued' },
]

describe('AgentRun', () => {
  it('lists steps in order, as an ordered list', () => {
    render(<AgentRun name="Agent" runId="run_1" status="running" steps={steps} />)
    const list = screen.getByRole('list', { name: 'Steps of Agent' })
    expect(list.tagName).toBe('OL')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('offers cancel while open and retry once failed', async () => {
    const onCancel = vi.fn()
    const onRetry = vi.fn()
    const { rerender } = render(
      <AgentRun name="Agent" runId="run_1" status="running" steps={steps} onCancel={onCancel} onRetry={onRetry} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel run' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Retry run' })).not.toBeInTheDocument()

    rerender(<AgentRun name="Agent" runId="run_1" status="failed" steps={steps} onCancel={onCancel} onRetry={onRetry} />)
    expect(screen.queryByRole('button', { name: 'Cancel run' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry run' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('announces a change of run status once, not on mount', () => {
    const { rerender } = render(<AgentRun name="Agent" runId="run_1" status="running" steps={steps} />)
    const status = () => screen.getAllByRole('status').find((el) => el.textContent?.startsWith('Run'))
    expect(status()).toBeUndefined()
    rerender(<AgentRun name="Agent" runId="run_1" status="succeeded" steps={steps} />)
    expect(status()).toHaveTextContent('Run succeeded.')
  })

  it('shows the run id as a literal', () => {
    render(<AgentRun name="Agent" runId="run_01JA" status="succeeded" steps={steps} />)
    expect(screen.getByText('run_01JA')).toHaveClass('literal')
  })
})
