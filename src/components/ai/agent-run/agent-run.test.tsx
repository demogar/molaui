import { composeStories } from '@storybook/react-vite'
import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StreamingText } from '../streaming-text'
import { ToolCall } from '../tool-call'
import { AgentRun, type AgentStep } from './agent-run'
import * as stories from './agent-run.stories'

const { WaitingForApproval } = composeStories(stories)

const steps: AgentStep[] = [
  { id: 'a', kind: 'reasoning', title: 'Plan', status: 'succeeded', durationMs: 2400 },
  { id: 'b', kind: 'tool', title: 'Query', status: 'running', startedAt: Date.now() },
  { id: 'c', kind: 'message', title: 'Answer', status: 'queued' },
]

describe('AgentRun', () => {
  it('raises a failed step once: the run panel alerts, the tool call keeps the error as a record', () => {
    const error = 'PermissionDenied: role lacks SELECT'
    const failed: AgentStep[] = [
      steps[0]!,
      {
        id: 'b',
        kind: 'tool',
        title: 'Query',
        status: 'failed',
        detail: <ToolCall name="query_warehouse" status="failed" error={error} onRetry={vi.fn()} />,
      },
    ]
    render(<AgentRun name="Agent" runId="run_1" status="failed" steps={failed} failure={{ stepId: 'b', error }} />)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Retry call' })).not.toBeInTheDocument()
    expect(screen.getAllByText(error)).toHaveLength(2)
  })

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

  it('tabs through Cancel run, Copy run id and each step with detail, and back with Shift+Tab', async () => {
    const onCancel = vi.fn()
    render(
      <AgentRun
        name="Agent"
        runId="run_1"
        status="running"
        onCancel={onCancel}
        steps={[
          { id: 'a', kind: 'reasoning', title: 'Plan', status: 'succeeded', durationMs: 2400, detail: <p>Plan detail</p> },
          { id: 'b', kind: 'tool', title: 'Query', status: 'running', startedAt: Date.now() },
        ]}
      />,
    )
    const cancel = screen.getByRole('button', { name: 'Cancel run' })
    const copy = screen.getByRole('button', { name: 'Copy run id' })
    const step = screen.getByRole('button', { name: /Plan/ })
    await userEvent.tab()
    expect(cancel).toHaveFocus()
    await userEvent.tab()
    expect(copy).toHaveFocus()
    await userEvent.tab()
    expect(step).toHaveFocus()
    // A step without detail is not a stop.
    expect(screen.queryByRole('button', { name: /Query/ })).not.toBeInTheDocument()

    await userEvent.keyboard('{Enter}')
    expect(step).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Plan detail')).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(step).toHaveAttribute('aria-expanded', 'false')

    await userEvent.tab({ shift: true })
    expect(copy).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(cancel).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('announces a change of run status once, not on mount', () => {
    const { rerender } = render(<AgentRun name="Agent" runId="run_1" status="running" steps={steps} />)
    const status = () => screen.getAllByRole('status').find((el) => el.textContent?.startsWith('Run'))
    expect(status()).toBeUndefined()
    rerender(<AgentRun name="Agent" runId="run_1" status="succeeded" steps={steps} />)
    expect(status()).toHaveTextContent('Run succeeded.')
  })

  // "Response complete." from the stream and "Run succeeded." from the run
  // landed in two polite regions in the same tick.
  it('says a success once, when a streamed answer inside it finishes', () => {
    const run = (status: 'running' | 'succeeded') => (
      <AgentRun
        name="Agent"
        runId="run_1"
        status={status}
        steps={[
          {
            id: 'c',
            kind: 'message',
            title: 'Answer',
            status,
            defaultOpen: true,
            detail: <StreamingText text="Done." status={status === 'running' ? 'streaming' : 'done'} />,
          },
        ]}
      />
    )
    const { rerender } = render(run('running'))
    rerender(run('succeeded'))
    const said = screen
      .getAllByRole('status')
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
    expect(said).toEqual(['Run succeeded.'])
  })

  // A failed step's header was `disabled`, so Tab skipped the one step that
  // most needed reading.
  it('keeps a step that is held open a tab stop', async () => {
    const user = userEvent.setup()
    render(
      <AgentRun
        name="Agent"
        runId="run_1"
        status="failed"
        steps={[{ id: 'b', kind: 'tool', title: 'Query', status: 'failed', detail: <p>PermissionDenied</p> }]}
      />,
    )
    const header = screen.getByRole('button', { name: /Query/ })
    // Past Copy run id and whatever else comes first; a disabled header is never reached.
    for (let i = 0; i < 10 && document.activeElement !== header; i++) await user.tab()
    expect(header).toHaveFocus()
    expect(header).toHaveAttribute('aria-disabled', 'true')
    expect(header).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows the run id as a literal', () => {
    render(<AgentRun name="Agent" runId="run_01JA" status="succeeded" steps={steps} />)
    expect(screen.getByText('run_01JA')).toHaveClass('literal')
  })

  // The story's open step used to start at the fixture date, so its live clock
  // read the days since then ("220h 03m") in the story and its screenshot.
  it('shows the waiting story in minutes, not the days since the fixture date', () => {
    render(<WaitingForApproval />)
    expect(document.body.textContent).not.toMatch(/\d+h\b/)
    expect(document.body.textContent).toMatch(/1m 0\ds/)
  })
})
