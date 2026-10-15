import { act, fireEvent, render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DataTable, type DataTableColumn } from './data-table'
import { INITIAL_ROWS, OVERSCAN } from './use-virtual-rows'

/**
 * The long-table features of DataTable (#104): virtual rows, column resize,
 * row expansion, a frozen first column and the stacked phone layout. The
 * table's own tests are in table.test.tsx.
 */

interface Row {
  id: string
  name: string
  cost: number
}

const rows: Row[] = [
  { id: 'a', name: 'Bravo', cost: 3 },
  { id: 'b', name: 'Alpha', cost: 10 },
  { id: 'c', name: 'Charlie', cost: 1 },
]

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'cost', header: 'Cost', sortable: true, align: 'end' },
]

const many: Row[] = Array.from({ length: 10_000 }, (_, i) => ({ id: `r${i}`, name: `Run ${i}`, cost: i }))

/** jsdom does no layout: give the frame a height and a scroll position by hand. */
function scrollFrame(frame: HTMLElement, top: number, height = 400) {
  Object.defineProperty(frame, 'clientHeight', { configurable: true, value: height })
  Object.defineProperty(frame, 'scrollTop', { configurable: true, value: top })
  act(() => {
    fireEvent.scroll(frame)
  })
}

describe('DataTable virtualize', () => {
  const big = () =>
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={many}
        getRowId={(r) => r.id}
        rowLabel={(r) => `Select ${r.id}`}
        selectable
        virtualize
        stickyHeader
      />,
    )

  it('renders a window of ten thousand rows, not every row: the perf budget', () => {
    big()
    const table = screen.getByRole('table', { name: 'Runs' })
    // The header, the window, and the trailing spacer.
    const rendered = table.querySelectorAll('tbody > tr[data-row-id]')
    expect(rendered.length).toBeLessThanOrEqual(INITIAL_ROWS)
    expect(table.querySelectorAll('tr').length).toBeLessThan(INITIAL_ROWS + 4)
  })

  it('tells assistive tech the full count and each row’s place in it', () => {
    big()
    const table = screen.getByRole('table', { name: 'Runs' })
    expect(table).toHaveAttribute('aria-rowcount', '10001')
    const [header, first] = screen.getAllByRole('row')
    expect(header).toHaveAttribute('aria-rowindex', '1')
    expect(first).toHaveAttribute('aria-rowindex', '2')
    // The spacers are layout only.
    for (const spacer of table.querySelectorAll('[data-slot="data-table-spacer"]')) {
      expect(spacer).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('moves the window with the scroll position', () => {
    big()
    const frame = screen.getByRole('table', { name: 'Runs' }).parentElement!
    // 40px rows: 40,000px down is row 1,000, aria-rowindex 1,002.
    scrollFrame(frame, 40_000)
    const row = screen.getByRole('checkbox', { name: 'Select r1000' }).closest('tr')!
    expect(row).toHaveAttribute('aria-rowindex', '1002')
    expect(screen.queryByRole('checkbox', { name: 'Select r0' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: `Select r${1000 - OVERSCAN}` })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: `Select r${1000 - OVERSCAN - 1}` })).toBeNull()
  })

  it('keeps the focused row rendered, and focused, when it is scrolled away', async () => {
    const user = userEvent.setup()
    big()
    const frame = screen.getByRole('table', { name: 'Runs' }).parentElement!
    const box = screen.getByRole('checkbox', { name: 'Select r2' })
    box.focus()
    scrollFrame(frame, 40_000)
    expect(box).toBeInTheDocument()
    expect(box).toHaveFocus()
    // Its neighbours went: only the focused row is kept.
    expect(screen.queryByRole('checkbox', { name: 'Select r3' })).toBeNull()
    await user.keyboard('[Space]')
    expect(box).toBeChecked()
  })

  it('finds the next row’s checkbox on Tab: the overscan keeps it rendered', async () => {
    const user = userEvent.setup()
    big()
    screen.getByRole('checkbox', { name: 'Select r4' }).focus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Select r5' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('checkbox', { name: 'Select r4' })).toHaveFocus()
  })

  it('selects every row, rendered or not, from the header', async () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable label="Runs" columns={columns} rows={many} getRowId={(r) => r.id} selectable virtualize onSelectionChange={onSelectionChange} />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(onSelectionChange.mock.calls[0]![0].size).toBe(10_000)
  })

  it('counts open detail rows in the row count and the indexes after them', () => {
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={many}
        getRowId={(r) => r.id}
        virtualize
        renderExpanded={(r) => `Detail of ${r.id}`}
        defaultExpanded={['r1']}
      />,
    )
    expect(screen.getByRole('table', { name: 'Runs' })).toHaveAttribute('aria-rowcount', '10002')
    expect(screen.getByText('Detail of r1').closest('tr')).toHaveAttribute('aria-rowindex', '4')
    expect(screen.getByRole('button', { name: 'Details of row r2' }).closest('tr')).toHaveAttribute('aria-rowindex', '5')
  })

  it('leaves a table without it exactly as it was: every row, no row indexes', () => {
    render(<DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} />)
    const table = screen.getByRole('table', { name: 'Runs' })
    expect(table).not.toHaveAttribute('aria-rowcount')
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect(screen.getAllByRole('row')[1]).not.toHaveAttribute('aria-rowindex')
  })
})

describe('DataTable resizableColumns', () => {
  const resizable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        resizableColumns
        defaultColumnWidths={{ name: 200 }}
        {...props}
      />,
    )

  it('puts a focusable separator on every header but the last', () => {
    resizable()
    const handle = screen.getByRole('separator', { name: 'Resize Name' })
    expect(handle).toHaveAttribute('tabindex', '0')
    expect(handle).toHaveAttribute('aria-orientation', 'vertical')
    expect(handle).toHaveAttribute('aria-valuenow', '200')
    expect(handle).toHaveAttribute('aria-valuemin', '64')
    expect(handle).toHaveAttribute('aria-valuemax', '800')
    // The last column takes what is left; its edge is the table's.
    expect(screen.queryByRole('separator', { name: 'Resize Cost' })).toBeNull()
    // A tab stop of its own, after the sort button, not inside it.
    expect(within(screen.getByRole('button', { name: 'Name' })).queryByRole('separator')).toBeNull()
  })

  it('keeps the handle’s name out of the column header’s, which every cell is announced with', () => {
    resizable()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toContainElement(screen.getByRole('separator', { name: 'Resize Name' }))
  })

  it('widens and narrows with the arrow keys, by 16px and by 64px with Shift', async () => {
    const user = userEvent.setup()
    const onColumnWidthsChange = vi.fn()
    resizable({ onColumnWidthsChange })
    const handle = screen.getByRole('separator', { name: 'Resize Name' })
    handle.focus()
    await user.keyboard('{ArrowRight}')
    expect(handle).toHaveAttribute('aria-valuenow', '216')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(handle).toHaveAttribute('aria-valuenow', '184')
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(handle).toHaveAttribute('aria-valuenow', '248')
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect(handle).toHaveAttribute('aria-valuenow', '184')
    expect(onColumnWidthsChange).toHaveBeenLastCalledWith({ name: 184 })
  })

  it('goes to the narrowest on Home and the widest on End', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        label="Runs"
        columns={[{ ...columns[0]!, minWidth: 96, maxWidth: 320 }, columns[1]!]}
        rows={rows}
        getRowId={(r) => r.id}
        resizableColumns
        defaultColumnWidths={{ name: 200 }}
      />,
    )
    const handle = screen.getByRole('separator', { name: 'Resize Name' })
    handle.focus()
    await user.keyboard('{Home}')
    expect(handle).toHaveAttribute('aria-valuenow', '96')
    await user.keyboard('{End}')
    expect(handle).toHaveAttribute('aria-valuenow', '320')
    await user.keyboard('{ArrowRight}')
    expect(handle).toHaveAttribute('aria-valuenow', '320')
  })

  it('follows the edge in right-to-left: the arrow pointing away from the column widens it', async () => {
    const user = userEvent.setup()
    render(
      <div dir="rtl">
        <DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} resizableColumns defaultColumnWidths={{ name: 200 }} />
      </div>,
    )
    const handle = screen.getByRole('separator', { name: 'Resize Name' })
    handle.focus()
    await user.keyboard('{ArrowLeft}')
    expect(handle).toHaveAttribute('aria-valuenow', '216')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(handle).toHaveAttribute('aria-valuenow', '184')
  })

  it('does not scroll the frame with the same arrow', async () => {
    resizable()
    const handle = screen.getByRole('separator', { name: 'Resize Name' })
    handle.focus()
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    act(() => {
      handle.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })

  it('resizes by dragging, mirrored in right-to-left', () => {
    resizable()
    const handle = screen.getByRole('separator', { name: 'Resize Name' })
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 })
    expect(handle).toHaveAttribute('aria-valuenow', '250')
    fireEvent.pointerUp(handle, { pointerId: 1 })
    // After the pointer is released, moving it changes nothing.
    fireEvent.pointerMove(handle, { clientX: 400, pointerId: 1 })
    expect(handle).toHaveAttribute('aria-valuenow', '250')
  })

  it('fixes the layout once a column has a width, leaving the last column to take the rest', () => {
    const { rerender } = render(<DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} resizableColumns />)
    const table = screen.getByRole('table', { name: 'Runs' })
    expect(table.className).not.toMatch(/table-fixed/)
    rerender(<DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} resizableColumns columnWidths={{ name: 240 }} />)
    expect(table.className).toMatch(/table-fixed/)
    const cols = table.querySelectorAll('col')
    expect((cols[0] as HTMLElement).style.width).toBe('240px')
    expect((cols[1] as HTMLElement).style.width).toBe('')
  })

  it('gives a column marked resizable: false no handle', () => {
    render(
      <DataTable
        label="Runs"
        columns={[{ ...columns[0]!, resizable: false }, { key: 'id', header: 'Id' }, columns[1]!]}
        rows={rows}
        getRowId={(r) => r.id}
        resizableColumns
      />,
    )
    expect(screen.queryByRole('separator', { name: 'Resize Name' })).toBeNull()
    expect(screen.getByRole('separator', { name: 'Resize Id' })).toBeInTheDocument()
  })
})

describe('DataTable renderExpanded', () => {
  const expandable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        renderExpanded={(r) => <p>Cost breakdown for {r.name}</p>}
        expandLabel={(r) => `Details of ${r.name}`}
        {...props}
      />,
    )

  it('is a disclosure: a button with aria-expanded that controls the detail row', async () => {
    const user = userEvent.setup()
    expandable()
    const button = screen.getByRole('button', { name: 'Details of Bravo' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).not.toHaveAttribute('aria-controls')
    expect(screen.queryByText('Cost breakdown for Bravo')).toBeNull()

    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const detail = screen.getByText('Cost breakdown for Bravo').closest('tr')!
    expect(button).toHaveAttribute('aria-controls', detail.id)
    // Directly under its row.
    expect(button.closest('tr')!.nextElementSibling).toBe(detail)

    await user.keyboard('[Space]')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Cost breakdown for Bravo')).toBeNull()
  })

  it('spans the detail across every column, the checkbox and disclosure columns included', () => {
    expandable({ selectable: true, defaultExpanded: ['b'] })
    const cell = screen.getByText('Cost breakdown for Alpha').closest('td')!
    expect(cell).toHaveAttribute('colspan', '4')
  })

  it('leaves the button off a row with nothing to expand', () => {
    expandable({ canExpand: (r) => r.id !== 'c' })
    expect(screen.getByRole('button', { name: 'Details of Bravo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Details of Charlie' })).toBeNull()
  })

  it('is controllable, and reports the new set', async () => {
    const onExpandedChange = vi.fn()
    expandable({ expanded: new Set(['a']), onExpandedChange })
    expect(screen.getByText('Cost breakdown for Bravo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Details of Alpha' }))
    expect(onExpandedChange).toHaveBeenCalledWith(new Set(['a', 'b']))
    // Controlled: nothing opens until the parent says so.
    expect(screen.queryByText('Cost breakdown for Alpha')).toBeNull()
  })

  it('names the button after the row by default', () => {
    render(<DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} renderExpanded={() => 'x'} />)
    expect(screen.getByRole('button', { name: 'Details of row a' })).toBeInTheDocument()
  })
})

describe('DataTable stickyFirstColumn', () => {
  it('freezes the leading columns and the first data column, with an ink edge where they end', () => {
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        selectable
        renderExpanded={() => 'x'}
        stickyFirstColumn
        framed
      />,
    )
    const [box, disclosure, name, cost] = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')
    expect(box!.className).toMatch(/\bsticky\b/)
    expect(box!.className).toMatch(/\bstart-0\b/)
    expect(disclosure!.className).toMatch(/\bstart-11\b/)
    expect(name!.className).toMatch(/\bstart-22\b/)
    expect(name!.className).toMatch(/\bcut-e\b/)
    // Opaque, so what scrolls under it does not show through.
    expect(name!.className).toMatch(/\bbg-cloth-pale\b/)
    expect(cost!.className).not.toMatch(/\bsticky\b/)
    const head = screen.getByRole('columnheader', { name: 'Name' })
    expect(head.className).toMatch(/\bsticky\b/)
    expect(head.className).toMatch(/\bcut-e\b/)
    expect(head.className).toMatch(/\bcut-b\b/)
  })

  it('puts the frozen header cells above the rest of a sticky header', () => {
    render(<DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} stickyFirstColumn stickyHeader />)
    expect(screen.getByRole('columnheader', { name: 'Name' }).className).toMatch(/z-\(--z-sticky\)/)
    expect(screen.getByRole('columnheader', { name: 'Cost' }).className).toMatch(/z-\(--z-lift\)/)
    expect(screen.getByRole('columnheader', { name: 'Cost' }).className).not.toMatch(/z-\(--z-sticky\)/)
  })
})

describe('DataTable stackWhenNarrow', () => {
  it('wraps the table in a container and keeps its table semantics with explicit roles', () => {
    const { container } = render(
      <DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} selectable stackWhenNarrow />,
    )
    expect(container.querySelector('[data-slot="data-table"]')!.className).toMatch(/@container\/data-table/)
    const table = screen.getByRole('table', { name: 'Runs' })
    expect(table).toHaveAttribute('role', 'table')
    for (const row of screen.getAllByRole('row')) expect(row).toHaveAttribute('role', 'row')
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('role', 'columnheader')
  })

  it('labels each value for sight only: the cell’s name is still its value', () => {
    render(<DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} stackWhenNarrow />)
    const cell = screen.getByRole('cell', { name: 'Bravo' })
    const label = within(cell).getByText('Name')
    expect(label).toHaveAttribute('aria-hidden', 'true')
  })

  it('is not applied to a virtual table, whose rows must be one height', () => {
    const { container } = render(
      <DataTable label="Runs" columns={columns} rows={rows} getRowId={(r) => r.id} stackWhenNarrow virtualize />,
    )
    expect(container.querySelector('[data-slot="data-table"]')).toBeNull()
    expect(screen.getByRole('table', { name: 'Runs' })).not.toHaveAttribute('role')
  })
})
