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
