import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Placeholder } from './placeholder'
import { Skeleton, SkeletonText } from './skeleton'

describe('Placeholder', () => {
  it('is one image named by its alt, not two lines of loose text', () => {
    render(<Placeholder label="Chart" name="Retention" alt="No data yet for retention" />)
    expect(screen.getByRole('img', { name: 'No data yet for retention' })).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('is hidden from assistive tech', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('ends a paragraph ragged', () => {
    const { container } = render(<SkeletonText lines={3} />)
    const bars = container.querySelectorAll('[data-slot="skeleton"]')
    expect(bars).toHaveLength(3)
    expect(bars[2]!.className).toContain('w-3/5')
  })
})
