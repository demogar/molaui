import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StepList, Timeline } from './timeline'

describe('Timeline', () => {
  it('is a named ordered list', () => {
    render(<Timeline label="Deploy history" items={[{ title: 'Built' }, { title: 'Shipped' }]} />)
    const list = screen.getByRole('list', { name: 'Deploy history' })
    expect(list.tagName).toBe('OL')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('draws no connector after the last event', () => {
    const { container } = render(<Timeline label="x" items={[{ title: 'a' }, { title: 'b' }]} />)
    const spines = container.querySelectorAll('li > span[aria-hidden]')
    expect(spines[0]?.children).toHaveLength(2)
    expect(spines[1]?.children).toHaveLength(1)
  })
})

describe('StepList', () => {
  it('hides positional numerals but reads authored labels', () => {
    const { rerender } = render(<StepList items={[{ title: 'Freeze' }]} />)
    expect(screen.getByText('01')).toHaveAttribute('aria-hidden', 'true')
    rerender(<StepList items={[{ label: 'Before launch', title: 'Freeze' }]} />)
    expect(screen.getByText('Before launch')).not.toHaveAttribute('aria-hidden')
  })
})
