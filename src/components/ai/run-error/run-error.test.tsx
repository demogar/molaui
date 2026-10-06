import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentRun, type AgentStep } from '../agent-run'

import { PartialOutput, RunError, formatRunErrorDetails } from './run-error'
import { formatCountdown } from './use-countdown'

const ERROR = 'PermissionDenied: role "agent_readonly" lacks SELECT on analytics.ro_0412_segments'

afterEach(() => {
  vi.useRealTimers()
})

describe('RunError', () => {
  it('names the step, says what happened in a sentence, and shows the error verbatim', () => {
    render(<RunError step="Break the result down by plan" stepNumber={4} stepCount={5} tool="query_warehouse" error={ERROR} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed')
    expect(alert).toHaveTextContent('Stopped at step 4 of 5: Break the result down by plan.')
    expect(alert).toHaveTextContent('query_warehouse returned an error, so the run stopped.')
    const literal = screen.getByText(ERROR)
    expect(literal).toHaveAttribute('dir', 'ltr')
    expect(literal.closest('p')).toHaveClass('literal')
  })

  it('offers retry from the step and retry run, by keyboard', async () => {
    const onRetry = vi.fn()
    const onRetryFromStep = vi.fn()
    render(<RunError stepNumber={4} error={ERROR} onRetry={onRetry} onRetryFromStep={onRetryFromStep} />)
    const user = userEvent.setup()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Retry from step 4' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Retry run' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onRetryFromStep).toHaveBeenCalledOnce()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('copies the details as plain text and says so once', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<RunError runId="run_1" step="Query" stepNumber={2} tool="q" error="boom" at={Date.UTC(2026, 9, 5, 14, 2)} />)
    await user.click(screen.getByRole('button', { name: 'Copy error details' }))
    expect(writeText).toHaveBeenCalledWith(
      'Status: Failed\nRun: run_1\nStep: 2 — Query\nTool: q\nError: boom\nAt: 2026-10-05T14:02:00.000Z',
    )
    expect(screen.getByText('Error details copied.')).toHaveAttribute('role', 'status')
  })

  it('treats a cancellation as a stop, not an error: no alert and nothing to copy', () => {
    render(<RunError kind="cancelled" step="Write the answer" stepNumber={5} onRetryFromStep={vi.fn()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Stopped at step 5: Write the answer.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy error details' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry from step 5' })).toBeEnabled()
  })

  it('counts down a rate limit, announcing at the start, at ten seconds and at zero only', () => {
    vi.useFakeTimers()
    const onRetryFromStep = vi.fn()
    render(<RunError kind="rate_limited" stepNumber={3} retryAt={Date.now() + 15_000} autoRetry onRetryFromStep={onRetryFromStep} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Retrying automatically in 15 seconds.')
    const status = () => screen.getAllByRole('status').map((el) => el.textContent).filter(Boolean).join('|')

    const heard: string[] = []
    for (let s = 1; s <= 16; s++) {
      act(() => vi.advanceTimersByTime(1000))
      heard.push(status())
    }
    // The visible figure ticks; what is announced changes twice.
    expect(new Set(heard.filter(Boolean))).toEqual(new Set(['Retrying in 10 seconds.', 'Retrying now.']))
    expect(heard.filter((h, i) => h !== heard[i - 1]).length).toBeLessThanOrEqual(3)
    expect(onRetryFromStep).toHaveBeenCalledOnce()
  })

  it('holds the retry buttons until a manual wait is over, and says why', () => {
    vi.useFakeTimers()
    render(<RunError kind="timed_out" stepNumber={3} retryAt={Date.now() + 5_000} onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Retry run' })).toBeDisabled()
    expect(screen.getByText(/You can retry in/, { selector: 'p' })).toHaveTextContent('You can retry in 5s.')
    act(() => vi.advanceTimersByTime(5_500))
    expect(screen.getByRole('button', { name: 'Retry run' })).toBeEnabled()
    expect(screen.getByText('You can retry now.', { selector: '[role=status]' })).toBeInTheDocument()
  })
})

describe('formatCountdown', () => {
  it('rounds up and pads past a minute', () => {
    expect(formatCountdown(400)).toBe('1s')
    expect(formatCountdown(24_000)).toBe('24s')
    expect(formatCountdown(65_000)).toBe('1m 05s')
  })
})

describe('formatRunErrorDetails', () => {
  it('leaves out what it was not given', () => {
    expect(formatRunErrorDetails({ kind: 'timed_out', error: 'deadline exceeded' })).toBe('Status: Timed out\nError: deadline exceeded')
  })
})

describe('PartialOutput', () => {
  it('keeps what arrived and says where it ends', () => {
    render(<PartialOutput>The help panel cut tickets</PartialOutput>)
    expect(screen.getByText('Partial output')).toBeInTheDocument()
    expect(screen.getByText('The help panel cut tickets')).toBeInTheDocument()
    expect(screen.getByText('Output stops here. The rest never arrived.')).toBeInTheDocument()
  })
})

describe('AgentRun with a failure', () => {
  const steps: AgentStep[] = [
    { id: 'plan', kind: 'reasoning', title: 'Plan', status: 'succeeded', durationMs: 2400 },
    { id: 'seg', kind: 'tool', title: 'Break down by plan', status: 'failed', durationMs: 412 },
    { id: 'answer', kind: 'message', title: 'Answer', status: 'queued' },
  ]

  it('points at the failed step and retries from it', async () => {
    const onRetryFromStep = vi.fn()
    render(
      <AgentRun
        name="Agent"
        runId="run_1"
        status="failed"
        steps={steps}
        onRetry={vi.fn()}
        onRetryFromStep={onRetryFromStep}
        failure={{ stepId: 'seg', tool: 'query_warehouse', error: ERROR }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Stopped at step 2 of 3: Break down by plan.')
    // The panel owns retry; the header does not offer a second one.
    expect(screen.getAllByRole('button', { name: 'Retry run' })).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Retry from step 2' }))
    expect(onRetryFromStep).toHaveBeenCalledWith('seg')
  })

  it('moves focus to the run heading when a retry removes the panel', async () => {
    const user = userEvent.setup()
    const props = { name: 'Agent', runId: 'run_1', steps, onRetryFromStep: vi.fn() } as const
    const { rerender } = render(<AgentRun {...props} status="failed" failure={{ stepId: 'seg', error: ERROR }} />)
    screen.getByRole('button', { name: 'Retry from step 2' }).focus()
    await user.keyboard('{Enter}')
    rerender(<AgentRun {...props} status="running" />)
    expect(screen.getByRole('heading', { name: 'Agent' })).toHaveFocus()
  })

  it('does not announce "Run failed." on top of the alert', () => {
    const { rerender } = render(<AgentRun name="Agent" runId="run_1" status="running" steps={steps} />)
    rerender(<AgentRun name="Agent" runId="run_1" status="failed" steps={steps} failure={{ stepId: 'seg', error: ERROR }} />)
    expect(screen.queryByText('Run failed.')).not.toBeInTheDocument()
    rerender(<AgentRun name="Agent" runId="run_1" status="cancelled" steps={steps} failure={{ stepId: 'seg', kind: 'cancelled' }} />)
    expect(screen.getByText('Run cancelled.')).toBeInTheDocument()
  })
})
