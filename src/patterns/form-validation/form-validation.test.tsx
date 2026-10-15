import { render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AgentFormScreen } from './form-validation'

describe('AgentFormScreen', () => {
  it('opens empty with nothing flagged', () => {
    render(<AgentFormScreen />)
    expect(screen.getByRole('form', { name: 'Agent configuration' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('submitting empty lists every problem in a summary that takes focus, as the one announcement', async () => {
    const user = userEvent.setup()
    render(<AgentFormScreen />)
    await user.click(screen.getByRole('button', { name: 'Save agent' }))
    const summary = screen.getByRole('region', { name: '6 fields need fixing' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getAllByRole('link')).toHaveLength(6)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveAccessibleDescription(
      expect.stringContaining('Give the agent a name; it appears in every run and alert.'),
    )
  })

  it('opens validated for the errors story, with focus on the summary', async () => {
    render(<AgentFormScreen defaultValidated />)
    const summary = await screen.findByRole('region', { name: /fields need fixing$/ })
    await waitFor(() => expect(summary).toHaveFocus())
  })

  it('while loading, says so once and offers no Save', () => {
    render(<AgentFormScreen loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading the configuration')
    expect(screen.queryByRole('button', { name: 'Save agent' })).not.toBeInTheDocument()
  })

  it('someone who may not edit reads the saved values, with who can change them, and no control that refuses', () => {
    render(<AgentFormScreen canEdit={false} />)
    expect(screen.getByRole('region', { name: 'Only this agent’s owners can change its configuration' })).toHaveTextContent(
      'Ana Ríos or Bruno Vega',
    )
    expect(screen.getByText('refund-reviewer')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save agent' })).not.toBeInTheDocument()
  })
})
