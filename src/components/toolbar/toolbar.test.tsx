import { DirectionProvider } from '@base-ui/react/direction-provider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  Toolbar,
  ToolbarButton,
  ToolbarInput,
  ToolbarOverflow,
  ToolbarSeparator,
  ToolbarToggle,
  ToolbarToggleGroup,
} from './toolbar'

describe('Toolbar', () => {
  it('is one named toolbar that moves focus with the arrow keys', async () => {
    render(
      <Toolbar aria-label="Run actions">
        <ToolbarButton>Re-run</ToolbarButton>
        <ToolbarButton>Stop</ToolbarButton>
      </Toolbar>,
    )
    expect(screen.getByRole('toolbar', { name: 'Run actions' })).toBeInTheDocument()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Re-run' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveFocus()
    // One tab stop: Tab leaves the toolbar rather than visiting Stop.
    await userEvent.tab({ shift: true })
    expect(document.body).toHaveFocus()
  })

  it('mirrors the arrow keys in right-to-left', async () => {
    render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <Toolbar aria-label="Run actions">
            <ToolbarButton>Re-run</ToolbarButton>
            <ToolbarButton>Stop</ToolbarButton>
          </Toolbar>
        </div>
      </DirectionProvider>,
    )
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveFocus()
  })

  it('presses a toggle with Space and reports it', async () => {
    const onPressedChange = vi.fn()
    render(
      <Toolbar aria-label="View">
        <ToolbarToggle onPressedChange={onPressedChange}>Wrap lines</ToolbarToggle>
      </Toolbar>,
    )
    const toggle = screen.getByRole('button', { name: 'Wrap lines' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.tab()
    await userEvent.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(onPressedChange).toHaveBeenCalledWith(true)
  })

  it('walks through a toggle group inside the same roving focus, one pressed at a time', async () => {
    render(
      <Toolbar aria-label="Filter">
        <ToolbarToggleGroup aria-label="Status" defaultValue={['all']}>
          <ToolbarToggle value="all">All</ToolbarToggle>
          <ToolbarToggle value="failed">Failed</ToolbarToggle>
        </ToolbarToggleGroup>
        <ToolbarSeparator />
        <ToolbarButton>Refresh</ToolbarButton>
      </Toolbar>,
    )
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'All' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Failed' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Failed' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveFocus()
  })

  it('lets the arrows move the caret inside an input and leave only at its edge', async () => {
    render(
      <Toolbar aria-label="Filter">
        <ToolbarInput aria-label="Search runs" defaultValue="ab" />
        <ToolbarButton>Refresh</ToolbarButton>
      </Toolbar>,
    )
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Search runs' })
    await userEvent.click(input)
    input.setSelectionRange(1, 1)
    await userEvent.keyboard('{ArrowRight}')
    expect(input).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveFocus()
  })

  it('renders every overflow item when there is no layout to measure', async () => {
    const onSelect = vi.fn()
    render(
      <Toolbar aria-label="Bulk actions">
        <ToolbarOverflow
          items={[
            { key: 'a', label: 'Re-run', onSelect },
            { key: 'b', label: 'Archive', onSelect: () => {} },
          ]}
        />
      </Toolbar>,
    )
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Re-run' }))
    expect(onSelect).toHaveBeenCalled()
  })

  it('folds what does not fit into a More menu, and the arrows reach it', async () => {
    // jsdom has no layout: give every button 80px and the row 200px, which
    // fits one item plus the More button.
    const observers: ResizeObserverCallback[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          observers.push(cb)
        }
        observe() {}
        disconnect() {}
      },
    )
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80)
    const client = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200)
    const onArchive = vi.fn()
    try {
      render(
        <Toolbar aria-label="Bulk actions">
          <ToolbarOverflow
            items={[
              { key: 'a', label: 'Re-run', onSelect: () => {} },
              { key: 'b', label: 'Archive', onSelect: onArchive },
              { key: 'c', label: 'Delete', onSelect: () => {}, tone: 'danger' },
            ]}
          />
        </Toolbar>,
      )
      expect(screen.getByRole('button', { name: 'Re-run' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
      await userEvent.tab()
      await userEvent.keyboard('{ArrowRight}')
      const more = screen.getByRole('button', { name: 'More actions' })
      expect(more).toHaveFocus()
      await userEvent.keyboard('{Enter}')
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }))
      expect(onArchive).toHaveBeenCalled()
      expect(observers.length).toBeGreaterThan(0)
    } finally {
      width.mockRestore()
      client.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})
