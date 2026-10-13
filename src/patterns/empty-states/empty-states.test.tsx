import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SourcesScreen } from './empty-states'

describe('SourcesScreen', () => {
  it('lists sources with each sync state in words', () => {
    render(<SourcesScreen />)
    const table = screen.getByRole('table', { name: '5 sources' })
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    expect(within(table).getByText('Sync failed')).toBeInTheDocument()
  })

  it('first run: the empty state creates the first source, and there is nothing to search', () => {
    render(<SourcesScreen sources={[]} />)
    expect(screen.getByRole('heading', { level: 2, name: 'No knowledge sources yet' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Connect source' })).toHaveLength(2)
  })

  it('no results: keeps the count and the search, and Show all sources returns focus to the field', async () => {
    const user = userEvent.setup()
    render(<SourcesScreen />)
    const search = screen.getByRole('searchbox', { name: 'Search sources' })
    await user.type(search, 'onboarding')
    expect(screen.getByRole('heading', { level: 2, name: '5 sources' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No sources match “onboarding”' })).toBeInTheDocument()
    expect(screen.queryByText('No knowledge sources yet')).not.toBeInTheDocument()

    // From the keyboard: Tab from the field reaches Show all sources, Enter clears.
    await user.tab() // the field's own clear button
    await user.tab()
    expect(screen.getByRole('button', { name: 'Show all sources' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(search).toHaveValue('')
    expect(search).toHaveFocus()
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6)
  })

  it('loading: the table is busy and says so once', () => {
    render(<SourcesScreen status="loading" />)
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Loading knowledge sources')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('error: an alert with Retry, and focus on the list once it is back', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = render(<SourcesScreen status="error" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Knowledge sources didn’t load')
    expect(screen.getByRole('button', { name: 'Connect source' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
    rerender(<SourcesScreen status="loading" onRetry={onRetry} />)
    rerender(<SourcesScreen status="ready" onRetry={onRetry} />)
    expect(screen.getByRole('heading', { level: 2, name: '5 sources' })).toHaveFocus()
  })

  it('no permission: names who can grant access, and offers no action the reader cannot take', async () => {
    const user = userEvent.setup()
    const onRequestAccess = vi.fn()
    render(<SourcesScreen status="no-permission" onRequestAccess={onRequestAccess} />)
    expect(screen.getByRole('heading', { name: 'Only workspace admins can see sources' })).toBeInTheDocument()
    expect(screen.getByText(/Ana Ruiz or Kai Morales/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect source' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ask for access' }))
    expect(onRequestAccess).toHaveBeenCalledOnce()
  })
})
