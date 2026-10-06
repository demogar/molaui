import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AgentsScreen } from './list-and-detail'

// jsdom applies no stylesheet, so the container query never hides the Back
// button and the screen behaves as it does at one column: opening an agent
// moves focus into the detail. That is the layout with focus to manage.

const agentButton = (name: RegExp) => screen.getByRole('button', { name })

describe('AgentsScreen', () => {
  it('shows the first agent and marks it as the current one', () => {
    render(<AgentsScreen />)
    expect(agentButton(/^Support triage/)).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Support triage' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Success rate fell to 88.4%/ })).toBeInTheDocument()
  })

  it('states each agent’s state in words, not only colour', () => {
    render(<AgentsScreen />)
    const list = screen.getByRole('region', { name: 'All agents' })
    expect(within(list).getByRole('button', { name: 'Support triage Failing cayuco-steady-3 Last run 2m ago' })).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: /^Cheat-report reviewer Paused / })).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: /^Experiment analyst Draft .* Never run$/ })).toBeInTheDocument()
  })

  it('opens an agent on click, moves the current mark and focuses its heading', async () => {
    const user = userEvent.setup()
    render(<AgentsScreen />)
    await user.click(agentButton(/^Opening explainer/))
    expect(agentButton(/^Opening explainer/)).toHaveAttribute('aria-current', 'true')
    expect(agentButton(/^Support triage/)).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 2, name: 'Opening explainer' })).toHaveFocus()
  })

  it('opens an agent from the keyboard: Tab to it, Enter opens', async () => {
    const user = userEvent.setup()
    render(<AgentsScreen />)
    agentButton(/^Support triage/).focus()
    await user.tab()
    expect(agentButton(/^Opening explainer/)).toHaveFocus()
    await user.tab()
    expect(agentButton(/^Puzzle tagger/)).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 2, name: 'Puzzle tagger' })).toHaveFocus()
  })

  it('goes back to the list with focus on the agent it came from', async () => {
    const user = userEvent.setup()
    render(<AgentsScreen />)
    await user.click(agentButton(/^Coach feedback/))
    await user.click(screen.getByRole('button', { name: 'Back to agents' }))
    expect(agentButton(/^Coach feedback/)).toHaveFocus()
    expect(agentButton(/^Coach feedback/)).toHaveAttribute('aria-current', 'true')
  })

  it('works the same right to left: Tab order follows the list, Enter opens, Back restores focus', async () => {
    const user = userEvent.setup()
    render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <AgentsScreen />
        </div>
      </DirectionProvider>,
    )
    agentButton(/^Support triage/).focus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 2, name: 'Opening explainer' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Back to agents' }))
    expect(agentButton(/^Opening explainer/)).toHaveFocus()
  })

  it('a draft agent says it has not run and offers a test run', () => {
    render(<AgentsScreen defaultSelectedId="agt_experiment-analyst" />)
    expect(screen.getByRole('heading', { name: 'No runs yet' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Start a test run' }).length).toBeGreaterThan(0)
  })

  it('with no agents, shows the empty state and the way to create the first', () => {
    render(<AgentsScreen agents={[]} />)
    expect(screen.getByRole('heading', { name: 'No agents in Growth yet' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'All agents' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Create agent' })).toHaveLength(2)
  })
})
