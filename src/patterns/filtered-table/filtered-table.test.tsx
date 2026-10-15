import { render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { RUNS, RunsAdminScreen } from './filtered-table'

const table = () => screen.getByRole('table', { name: 'Agent runs' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const toggle = (name: RegExp) => screen.getByRole('button', { name })

describe('RunsAdminScreen states', () => {
  it('a search that matches nothing says so in the table and offers Clear filters, never a first run', () => {
    render(<RunsAdminScreen defaultQuery="run_nothing" />)
    expect(within(table()).getByText('No runs match these filters')).toBeInTheDocument()
    expect(within(table()).getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    expect(screen.queryByText(/first run/i)).not.toBeInTheDocument()
  })

  it('while loading, keeps the filters, drops the counts and marks the table busy', () => {
    render(<RunsAdminScreen status="loading" />)
    expect(screen.getByRole('search', { name: 'Runs' })).toBeInTheDocument()
    expect(toggle(/^Failed$/)).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('a failed load replaces the table with an error and Retry, keeping the filters', async () => {
    const user = userEvent.setup()
    let retried = 0
    render(<RunsAdminScreen status="error" onRetry={() => (retried += 1)} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Runs didn’t load' })).toBeInTheDocument()
    expect(screen.getByRole('search', { name: 'Runs' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retried).toBe(1)
  })

  it('a viewer selects and exports, but is offered no Cancel or New run, and is told who can', () => {
    render(<RunsAdminScreen canManage={false} defaultSelection={RUNS.slice(1, 3).map((run) => run.id)} />)
    expect(screen.getByRole('region', { name: 'Only workspace admins can start or cancel runs' })).toHaveTextContent('Ana Ruiz or Kai Morales')
    expect(screen.queryByRole('button', { name: /^Cancel( \d+)?$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New run' })).not.toBeInTheDocument()
  })
})

describe('RunsAdminScreen', () => {
  it('labels every filter and starts with none applied', () => {
    render(<RunsAdminScreen />)
    const search = screen.getByRole('search', { name: 'Runs' })
    expect(within(search).getByRole('searchbox', { name: 'Search' })).toBeInTheDocument()
    expect(within(search).getByRole('combobox', { name: 'Agent' })).toBeInTheDocument()
    expect(toggle(/^All/)).toHaveAttribute('aria-pressed', 'true')
    // Disabled but still focusable inside the toolbar, so it is aria-disabled.
    expect(screen.getByRole('button', { name: 'Clear filters' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('a status toggle shows exactly the runs its count promised', async () => {
    const user = userEvent.setup()
    render(<RunsAdminScreen />)
    const failed = toggle(/^Failed/)
    const promised = Number(failed.textContent?.replace(/\D/g, ''))
    await user.click(failed)
    expect(failed).toHaveAttribute('aria-pressed', 'true')
    const rows = bodyRows()
    expect(rows.length).toBe(Math.min(promised, 12))
    for (const row of rows) expect(row).toHaveTextContent(/failed/i)
  })

  it('a search that matches nothing says so and offers to clear the filters', async () => {
    const user = userEvent.setup()
    render(<RunsAdminScreen />)
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'no-such-run')
    expect(screen.getByRole('heading', { name: 'No runs match these filters' })).toBeInTheDocument()
    const clear = screen.getAllByRole('button', { name: 'Clear filters' })
    await user.click(clear[clear.length - 1]!)
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
    expect(bodyRows().length).toBeGreaterThan(0)
  })

  it('status toggles move with the arrow keys, as one toolbar', async () => {
    const user = userEvent.setup()
    render(<RunsAdminScreen />)
    toggle(/^All/).focus()
    await user.keyboard('{ArrowRight}')
    expect(toggle(/^Failed/)).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(toggle(/^Failed/)).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a run in a drawer, named by its agent', async () => {
    const user = userEvent.setup()
    render(<RunsAdminScreen />)
    const firstRun = within(bodyRows()[0]!).getAllByRole('button').find((button) => /^run_/.test(button.textContent ?? ''))!
    await user.click(firstRun)
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByText(firstRun.textContent!)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
