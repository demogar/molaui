import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from './segmented-control'

const options = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
]

describe('SegmentedControl', () => {
  it('is a named group of pressed-state buttons', () => {
    render(<SegmentedControl aria-label="View" options={options} defaultValue="board" />)
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the chosen value', async () => {
    const onValueChange = vi.fn()
    render(<SegmentedControl aria-label="View" options={options} defaultValue="table" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(onValueChange).toHaveBeenCalledWith('list')
  })

  it('is one tab stop; arrows wrap, Home and End jump, Enter and Space choose', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <>
        <SegmentedControl aria-label="View" options={options} defaultValue="table" onValueChange={onValueChange} />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(screen.getByRole('button', { name: 'Table' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    // Wraps from the first segment to the last.
    expect(screen.getByRole('button', { name: 'List' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Table' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'List' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('list')
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'Table' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenLastCalledWith('board')
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true')
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('never empties: pressing the active segment does nothing', async () => {
    const onValueChange = vi.fn()
    render(<SegmentedControl aria-label="View" options={options} value="table" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Table' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('names icon-only segments from their labels', () => {
    render(
      <SegmentedControl
        aria-label="View"
        iconOnly
        options={options.map((o) => ({ ...o, icon: <svg /> }))}
        defaultValue="table"
      />,
    )
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument()
  })
})
