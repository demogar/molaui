import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DirectionProvider } from '../../lib/direction'
import { Tree, type TreeNode } from './tree'

const items: TreeNode[] = [
  {
    value: 'src',
    label: 'src',
    children: [
      {
        value: 'retention',
        label: 'retention',
        children: [
          { value: 'policy', label: 'policy.ts' },
          { value: 'schedule', label: 'schedule.ts' },
        ],
      },
      { value: 'index', label: 'index.ts' },
    ],
  },
  { value: 'docs', label: 'docs', children: [{ value: 'guide', label: 'guide.md' }] },
  { value: 'changes', label: 'CHANGES.md' },
  { value: 'locked', label: 'locked.md', disabled: true },
]

const item = (name: string) => screen.getByRole('treeitem', { name })
const query = (name: string) => screen.queryByRole('treeitem', { name })

describe('Tree', () => {
  it('is a named tree of items with level, position and open state', () => {
    render(<Tree aria-label="Files" items={items} defaultExpanded={['src']} defaultValue="index" />)
    expect(screen.getByRole('tree', { name: 'Files' })).toBeInTheDocument()
    expect(item('src')).toHaveAttribute('aria-expanded', 'true')
    expect(item('src')).toHaveAttribute('aria-level', '1')
    expect(item('src')).toHaveAttribute('aria-posinset', '1')
    expect(item('src')).toHaveAttribute('aria-setsize', '4')
    expect(item('retention')).toHaveAttribute('aria-expanded', 'false')
    expect(item('index.ts')).toHaveAttribute('aria-level', '2')
    expect(item('index.ts')).toHaveAttribute('aria-selected', 'true')
    expect(item('CHANGES.md')).not.toHaveAttribute('aria-expanded')
    expect(item('locked.md')).toHaveAttribute('aria-disabled', 'true')
    // A closed branch's children are not rendered.
    expect(query('policy.ts')).toBeNull()
  })

  it('Tab lands on the selected item; ArrowDown, ArrowUp, Home and End move through what is visible', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Tree aria-label="Files" items={items} defaultExpanded={['src']} defaultValue="index" />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(item('index.ts')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('docs')).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(item('retention')).toHaveFocus()
    await user.keyboard('{End}')
    expect(item('locked.md')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('locked.md')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(item('src')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(item('src')).toHaveFocus()
  })

  it('ArrowRight opens a branch, then enters it; ArrowLeft closes it, then climbs to the parent', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()
    render(<Tree aria-label="Files" items={items} onExpandedChange={onExpandedChange} />)
    await user.tab()
    expect(item('src')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(item('src')).toHaveAttribute('aria-expanded', 'true')
    expect(item('src')).toHaveFocus()
    expect(onExpandedChange).toHaveBeenLastCalledWith(['src'])
    await user.keyboard('{ArrowRight}')
    expect(item('retention')).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(item('policy.ts')).toHaveFocus()
    // A leaf: ArrowRight does nothing.
    await user.keyboard('{ArrowRight}')
    expect(item('policy.ts')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('retention')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('retention')).toHaveAttribute('aria-expanded', 'false')
    expect(query('policy.ts')).toBeNull()
    await user.keyboard('{ArrowLeft}')
    expect(item('src')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('src')).toHaveAttribute('aria-expanded', 'false')
    // A closed root: ArrowLeft does nothing.
    await user.keyboard('{ArrowLeft}')
    expect(item('src')).toHaveFocus()
  })

  it('mirrors ArrowRight and ArrowLeft in right-to-left', async () => {
    const user = userEvent.setup()
    render(
      <DirectionProvider direction="rtl">
        <Tree aria-label="Files" items={items} />
      </DirectionProvider>,
    )
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(item('src')).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{ArrowRight}')
    expect(item('src')).toHaveAttribute('aria-expanded', 'false')
  })

  it('arrows only move; Enter, Space and a click select, and open or close a branch', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Tree aria-label="Files" items={items} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(item('CHANGES.md')).toHaveFocus()
    expect(onValueChange).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('changes')
    expect(item('CHANGES.md')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}[Space]')
    expect(onValueChange).toHaveBeenLastCalledWith('docs')
    expect(item('docs')).toHaveAttribute('aria-expanded', 'true')
    await user.click(item('guide.md'))
    expect(onValueChange).toHaveBeenLastCalledWith('guide')
    expect(item('guide.md')).toHaveFocus()
    // A disabled item is focused but never selected.
    await user.click(item('locked.md'))
    expect(onValueChange).toHaveBeenLastCalledWith('guide')
    expect(item('locked.md')).toHaveFocus()
  })

  it('* opens every branch beside the focused item', async () => {
    const user = userEvent.setup()
    render(<Tree aria-label="Files" items={items} />)
    await user.tab()
    await user.keyboard('*')
    expect(item('src')).toHaveAttribute('aria-expanded', 'true')
    expect(item('docs')).toHaveAttribute('aria-expanded', 'true')
    // Only the focused level: the nested branch stays closed.
    expect(item('retention')).toHaveAttribute('aria-expanded', 'false')
  })

  it('moves by type-ahead through the visible items', async () => {
    const user = userEvent.setup()
    render(<Tree aria-label="Files" items={items} defaultExpanded={['src']} />)
    await user.tab()
    await user.keyboard('i')
    expect(item('index.ts')).toHaveFocus()
    await new Promise((resolve) => setTimeout(resolve, 600))
    await user.keyboard('ch')
    expect(item('CHANGES.md')).toHaveFocus()
  })

  it('hands the tab stop to the open ancestor when its item is hidden', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <Tree aria-label="Files" items={items} expanded={['src', 'retention']} defaultValue="policy" />,
    )
    expect(item('policy.ts')).toHaveAttribute('tabindex', '0')
    // The parent closes the branch that holds the selected item.
    rerender(<Tree aria-label="Files" items={items} expanded={['src']} defaultValue="policy" />)
    expect(query('policy.ts')).toBeNull()
    await user.tab()
    expect(item('retention')).toHaveFocus()
  })

  it('controlled: shows the value and open branches it is given', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onExpandedChange = vi.fn()
    render(
      <Tree
        aria-label="Files"
        items={items}
        value="changes"
        onValueChange={onValueChange}
        expanded={[]}
        onExpandedChange={onExpandedChange}
      />,
    )
    await user.click(item('src'))
    expect(onValueChange).toHaveBeenCalledWith('src')
    expect(onExpandedChange).toHaveBeenCalledWith(['src'])
    expect(item('src')).toHaveAttribute('aria-expanded', 'false')
    expect(item('CHANGES.md')).toHaveAttribute('aria-selected', 'true')
  })
})
