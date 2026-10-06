import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Pagination, getPageRange } from './pagination'

describe('getPageRange', () => {
  it('lists every page when they fit', () => {
    expect(getPageRange(2, 5)).toEqual([1, 2, 3, 4, 5])
  })
  it('has a fixed number of slots wherever the current page is', () => {
    for (let p = 1; p <= 26; p++) expect(getPageRange(p, 26)).toHaveLength(7)
  })
  it('puts the current page between its siblings', () => {
    expect(getPageRange(10, 26)).toEqual([1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 26])
  })
  it('handles the edges', () => {
    expect(getPageRange(1, 26)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 26])
    expect(getPageRange(26, 26)).toEqual([1, 'ellipsis-start', 22, 23, 24, 25, 26])
  })
})

describe('Pagination', () => {
  it('marks the current page and moves on click', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={5} pageCount={26} onPageChange={onPageChange} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  it('disables previous on the first page', () => {
    render(<Pagination page={1} pageCount={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('states the row range in the compact variant', () => {
    render(<Pagination variant="compact" page={2} pageCount={26} pageSize={50} total={1284} onPageChange={() => {}} />)
    expect(screen.getByText('51–100').parentElement).toHaveTextContent('51–100 of 1,284')
  })
})
