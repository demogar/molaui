import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { RunsAdminScreen } from './filtered-table'

const table = () => screen.getByRole('table', { name: 'Agent runs' })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const toggle = (name: RegExp) => screen.getByRole('button', { name })

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
