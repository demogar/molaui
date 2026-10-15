import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DirectionProvider } from '../../lib/direction'
import { TagGroup, type TagGroupItem } from './tag-group'

const items: TagGroupItem[] = [
  { value: 'billing', label: 'Billing' },
  { value: 'retention', label: 'Retention' },
  { value: 'pii', label: 'Contains PII', disabled: true },
  { value: 'q3', label: 'Q3 review' },
]

const tag = (name: string) => screen.getByRole('row', { name })

/** A parent that owns the list, as a consumer of `onRemove` does. */
function Removable({ initial = items, onRemove }: { initial?: TagGroupItem[]; onRemove?: (value: string) => void }) {
  const [list, setList] = React.useState(initial)
  return (
    <>
      <TagGroup
        aria-label="Labels"
        items={list}
        empty="No labels"
        onRemove={(value) => {
          onRemove?.(value)
          setList((current) => current.filter((item) => item.value !== value))
        }}
      />
      <button type="button">After</button>
    </>
  )
}

describe('TagGroup', () => {
  it('is a named grid of rows, each named by its label', () => {
    render(<TagGroup aria-label="Labels" items={items} />)
    expect(screen.getByRole('grid', { name: 'Labels' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect(tag('Contains PII')).toHaveAttribute('aria-disabled', 'true')
    // Read-only: no remove buttons, no selection state.
    expect(screen.queryByRole('button')).toBeNull()
    expect(tag('Billing')).not.toHaveAttribute('aria-selected')
  })

  it('is one tab stop; arrows move without wrapping, Home and End jump', async () => {
    const user = userEvent.setup()
    render(
      <>
        <TagGroup aria-label="Labels" items={items} />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(tag('Billing')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(tag('Billing')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(tag('Retention')).toHaveFocus()
    // Disabled tags are still reached.
    await user.keyboard('{ArrowDown}')
    expect(tag('Contains PII')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(tag('Retention')).toHaveFocus()
    await user.keyboard('{End}')
    expect(tag('Q3 review')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(tag('Q3 review')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(tag('Billing')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    // Tab back returns to the tag last focused.
    await user.tab({ shift: true })
    expect(tag('Retention')).toHaveFocus()
  })

  it('mirrors left and right in right-to-left', async () => {
    const user = userEvent.setup()
    render(
      <DirectionProvider direction="rtl">
        <TagGroup aria-label="Labels" items={items} />
      </DirectionProvider>,
    )
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(tag('Retention')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(tag('Billing')).toHaveFocus()
  })

  it('Delete and Backspace remove the focused tag, and focus moves to the one that took its place', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<Removable onRemove={onRemove} />)
    expect(tag('Billing')).toHaveAttribute('aria-keyshortcuts', 'Delete Backspace')
    await user.tab()
    await user.keyboard('{Delete}')
    expect(onRemove).toHaveBeenLastCalledWith('billing')
    expect(tag('Retention')).toHaveFocus()
    // A disabled tag is not removed.
    await user.keyboard('{ArrowRight}{Backspace}')
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(tag('Contains PII')).toHaveFocus()
    // The last tag: focus moves back to the one before it.
    await user.keyboard('{End}{Backspace}')
    expect(onRemove).toHaveBeenLastCalledWith('q3')
    expect(tag('Contains PII')).toHaveFocus()
  })

  it('removing the last tag leaves focus on the group, which says it is empty', async () => {
    const user = userEvent.setup()
    render(<Removable initial={[{ value: 'billing', label: 'Billing' }]} />)
    await user.tab()
    await user.keyboard('{Delete}')
    expect(screen.getByRole('grid', { name: 'Labels' })).toHaveFocus()
    expect(screen.getByRole('gridcell', { name: 'No labels' })).toBeInTheDocument()
  })

  it('the × is a named button that removes its tag without selecting it', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <TagGroup
        aria-label="Labels"
        items={items}
        selectionMode="multiple"
        onValueChange={onValueChange}
        onRemove={vi.fn()}
        removeLabel={(label) => `Quitar ${label}`}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Quitar Contains PII' })).toBeNull()
    const remove = screen.getByRole('button', { name: 'Quitar Retention' })
    expect(remove).toHaveAttribute('tabindex', '-1')
    await user.click(remove)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('selectable: Space, Enter and a click toggle; single keeps one', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { unmount } = render(
      <TagGroup aria-label="Labels" items={items} selectionMode="multiple" defaultValue={['q3']} onValueChange={onValueChange} />,
    )
    expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true')
    expect(tag('Q3 review')).toHaveAttribute('aria-selected', 'true')
    await user.tab()
    await user.keyboard('[Space]')
    expect(onValueChange).toHaveBeenLastCalledWith(['billing', 'q3'])
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['billing', 'retention', 'q3'])
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onValueChange).toHaveBeenCalledTimes(2)
    await user.click(tag('Billing'))
    expect(onValueChange).toHaveBeenLastCalledWith(['retention', 'q3'])
    unmount()

    const single = vi.fn()
    render(<TagGroup aria-label="Labels" items={items} selectionMode="single" defaultValue={['billing']} onValueChange={single} />)
    await user.click(tag('Retention'))
    expect(single).toHaveBeenLastCalledWith(['retention'])
    expect(tag('Billing')).toHaveAttribute('aria-selected', 'false')
  })

  it('without selection, Space and Enter do nothing; without onRemove, Delete does nothing', async () => {
    const user = userEvent.setup()
    const onKeyDown = vi.fn()
    render(<TagGroup aria-label="Labels" items={items} onKeyDown={onKeyDown} />)
    await user.tab()
    await user.keyboard('{Enter}{Delete}')
    expect(tag('Billing')).toHaveFocus()
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect(onKeyDown).toHaveBeenCalledTimes(2)
  })

  it('a disabled group keeps its tags readable and drops every ×', () => {
    render(<TagGroup aria-label="Labels" items={items} disabled onRemove={vi.fn()} />)
    expect(screen.getByRole('grid')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('button')).toBeNull()
    expect(tag('Billing')).toHaveAttribute('aria-disabled', 'true')
  })
})
