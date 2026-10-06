import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DataTable, type DataTableColumn } from './data-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'

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

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').at(-2)?.textContent)

describe('Table primitives', () => {
  it('renders header cells as column headers and numeric cells right-aligned', () => {
    render(
      <Table aria-label="t">
        <TableHeader>
          <TableRow>
            <TableHead numeric>Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell numeric>$1.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(screen.getByRole('columnheader', { name: 'Cost' })).toHaveAttribute('scope', 'col')
    expect(screen.getByRole('cell')).toHaveClass('text-end', 'tabular-nums')
  })

  it('only announces aria-sort on the sorted column', () => {
    render(
      <Table aria-label="t">
        <TableHeader>
          <TableRow>
            <TableHead sort="none" onSort={() => {}}>
              A
            </TableHead>
            <TableHead sort="descending" onSort={() => {}}>
              B
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    )
    expect(screen.getByRole('columnheader', { name: 'A' })).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('columnheader', { name: 'B' })).toHaveAttribute('aria-sort', 'descending')
  })

  it('puts the full text of a truncated cell in its title', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell truncate>A very long agent name</TableCell>
          </tr>
        </tbody>
      </table>,
    )
    expect(screen.getByRole('cell')).toHaveAttribute('title', 'A very long agent name')
  })
})

describe('DataTable', () => {
  it('sorts ascending, then descending, then back to arrival order', async () => {
    render(<DataTable label="t" columns={columns} rows={rows} getRowId={(r) => r.id} />)
    const sortByCost = screen.getByRole('button', { name: 'Cost' })
    const costs = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[1]?.textContent)

    expect(costs()).toEqual(['3', '10', '1'])
    await userEvent.click(sortByCost)
    expect(costs()).toEqual(['1', '3', '10'])
    await userEvent.click(sortByCost)
    expect(costs()).toEqual(['10', '3', '1'])
    await userEvent.click(sortByCost)
    expect(costs()).toEqual(['3', '10', '1'])
  })

  it('does not mutate the rows it was given', async () => {
    const input = [...rows]
    render(<DataTable label="t" columns={columns} rows={input} getRowId={(r) => r.id} />)
    await userEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(input.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(names()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('selects rows, and the header box selects all / goes indeterminate', async () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        label="t"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        selectable
        rowLabel={(r) => `Select ${r.name}`}
        onSelectionChange={onSelectionChange}
      />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['b']))
    const all = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all rows' })
    expect(all.indeterminate).toBe(true)
    expect(screen.getByRole('checkbox', { name: 'Select Alpha' }).closest('tr')).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await userEvent.click(all)
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['a', 'b', 'c']))
    expect(screen.getByRole('checkbox', { name: 'Deselect all rows' })).toBeChecked()
  })

  it('shows the empty state with the headers still in place', () => {
    render(
      <DataTable label="t" columns={columns} rows={[]} getRowId={(r) => r.id} empty="No runs match." />,
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByText('No runs match.')).toBeInTheDocument()
  })
})

describe('DataTable — paging, server data, bulk actions and columns', () => {
  const many: Row[] = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i + 1}`,
    name: `Agent ${String(i + 1).padStart(2, '0')}`,
    cost: 12 - i,
  }))
  const firstNames = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0]?.textContent)

  it('slices client rows into pages and goes back to page 1 when the order changes', async () => {
    const onPageChange = vi.fn()
    render(
      <DataTable label="Runs" columns={columns} rows={many} getRowId={(r) => r.id} pageSize={5} onPageChange={onPageChange} />,
    )
    expect(firstNames()).toEqual(['Agent 01', 'Agent 02', 'Agent 03', 'Agent 04', 'Agent 05'])
    const pager = screen.getByRole('navigation', { name: 'Runs pages' })
    expect(within(pager).getByText(/of 12/)).toBeInTheDocument()

    await userEvent.click(within(pager).getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    expect(firstNames()[0]).toBe('Agent 06')

    await userEvent.click(screen.getByRole('button', { name: 'Cost' }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
    expect(firstNames()[0]).toBe('Agent 12')
  })

  it('in manual mode reports sort and page without applying them', async () => {
    const onSortChange = vi.fn()
    const onPageChange = vi.fn()
    render(
      <DataTable
        label="Runs"
        manual
        columns={columns}
        rows={many.slice(0, 5)}
        rowCount={1284}
        getRowId={(r) => r.id}
        pageSize={5}
        page={3}
        sort={null}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByText(/1,284/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cost' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'cost', direction: 'ascending' })
    expect(onPageChange).toHaveBeenCalledWith(1)
    // The rows stay in the order the server sent.
    expect(firstNames()).toEqual(['Agent 01', 'Agent 02', 'Agent 03', 'Agent 04', 'Agent 05'])
    // Controlled: the header does not claim a sort the parent has not applied.
    expect(screen.getByRole('columnheader', { name: 'Cost' })).not.toHaveAttribute('aria-sort')

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(4)
  })

  it('selects the page from the header box, announces the count once and offers bulk actions', async () => {
    const onArchive = vi.fn()
    render(
      <DataTable
        label="Runs"
        noun={{ one: 'run', other: 'runs' }}
        columns={columns}
        rows={many}
        getRowId={(r) => r.id}
        pageSize={5}
        selectable
        rowLabel={(r) => `Select ${r.name}`}
        bulkActions={({ selection, clear }) => (
          <button
            type="button"
            onClick={() => {
              onArchive([...selection])
              clear()
            }}
          >
            Archive
          </button>
        )}
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('No runs selected')
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }))
    expect(status).toHaveTextContent('5 of 12 runs selected')

    // Keyboard: Space on a row box takes one off; the header goes indeterminate.
    screen.getByRole('checkbox', { name: 'Select Agent 02' }).focus()
    await userEvent.keyboard(' ')
    expect(status).toHaveTextContent('4 of 12 runs selected')
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all rows on this page' }).indeterminate).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(onArchive).toHaveBeenCalledWith(['r1', 'r3', 'r4', 'r5'])
    expect(status).toHaveTextContent('No runs selected')
  })

  it('keeps the selection across pages', async () => {
    render(
      <DataTable label="Runs" columns={columns} rows={many} getRowId={(r) => r.id} pageSize={5} selectable rowLabel={(r) => `Select ${r.name}`} />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Agent 01' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Agent 06' }))
    expect(screen.getByRole('status')).toHaveTextContent('2 of 12 rows selected')
  })

  it('hides and shows columns from the menu, and never hides the last one', async () => {
    const onHiddenColumnsChange = vi.fn()
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        columnMenu
        onHiddenColumnsChange={onHiddenColumnsChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Columns' }))
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Cost' }))
    expect(onHiddenColumnsChange).toHaveBeenLastCalledWith(new Set(['cost']))
    expect(screen.queryByRole('columnheader', { name: 'Cost' })).not.toBeInTheDocument()
    // The menu stays open, and Name is now the last column standing.
    expect(screen.getByRole('menuitemcheckbox', { name: 'Name' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Columns' })).toHaveFocus()
  })

  it('takes an empty state as data, with an action', () => {
    render(
      <DataTable
        label="Runs"
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        empty={{ variant: 'no-results', title: 'No runs match', description: 'Nothing failed today.', actions: <button type="button">Clear filters</button> }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No runs match' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('marks the table busy while loading and draws skeleton rows hidden from assistive tech', () => {
    render(<DataTable label="Runs" columns={columns} rows={[]} getRowId={(r) => r.id} loading pageSize={5} />)
    expect(screen.getByRole('table', { name: 'Runs' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByRole('row')).toHaveLength(1)
  })
})
