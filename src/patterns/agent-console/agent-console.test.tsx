import { act, render, screen, within } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OPERATOR_QUESTION, QUERY_ERROR, RUN_LENGTH } from './_data'
import { AgentConsoleScreen } from './agent-console'

const run = () => screen.getByRole('complementary', { name: 'Run details' })
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('AgentConsoleScreen', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with nothing asked, two suggestions and an empty run panel', () => {
    render(<AgentConsoleScreen />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ask about a rollout, a metric or a brief.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Which guardrails/ })).toBeInTheDocument()
    expect(within(run()).getByText(/No run yet/)).toBeInTheDocument()
  })

  it('a suggestion runs the scripted agent to a cited answer, and the run panel finishes with it', () => {
    render(<AgentConsoleScreen />)
    act(() => screen.getByRole('button', { name: /^Which guardrails/ }).click())
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    advance(RUN_LENGTH + 500)
    expect(within(run()).getAllByText('Succeeded', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('Unverified figure')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
  })

  it('held mid-run, the answer is streaming and Stop is offered', () => {
    render(<AgentConsoleScreen defaultQuestion={OPERATOR_QUESTION} holdAt={7_000} />)
    advance(20_000)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    expect(screen.queryByText('Unverified figure')).not.toBeInTheDocument()
  })

  it('a failed tool call is said once, verbatim, and Retry asks again and succeeds', () => {
    render(<AgentConsoleScreen defaultQuestion={OPERATOR_QUESTION} failFirstRun />)
    advance(5_000)
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toHaveTextContent(QUERY_ERROR)
    expect(within(run()).getAllByText('Failed', { exact: false }).length).toBeGreaterThan(0)

    act(() => within(alerts[0]!).getByRole('button', { name: /retry/i }).click())
    advance(RUN_LENGTH + 500)
    expect(screen.getByText('Unverified figure')).toBeInTheDocument()
  })

  it('someone who may not ask gets no composer and no suggestions, and is told who can grant access', () => {
    render(<AgentConsoleScreen canAsk={false} />)
    expect(screen.queryByRole('textbox', { name: 'Message Cayuco' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Which guardrails/ })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'You can read this workspace, not ask its agent' })).toHaveTextContent(
      'Ana Ruiz or Kai Morales',
    )
  })
})
