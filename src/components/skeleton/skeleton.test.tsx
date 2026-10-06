import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { Skeleton, SkeletonGroup, SkeletonText } from './skeleton'

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

  it('sizes an avatar bone on the same steps as Avatar', () => {
    const { container } = render(<Skeleton shape="avatar" size="lg" />)
    expect(container.firstElementChild).toHaveClass('size-10')
    expect(container.firstElementChild).toHaveAttribute('data-shape', 'avatar')
  })

  it('drops the sweep under reduced motion', () => {
    const { container } = render(<Skeleton shape="text" />)
    expect(container.firstElementChild).toHaveClass('motion-reduce:after:hidden')
  })
})

describe('SkeletonGroup', () => {
  function Demo() {
    const [loading, setLoading] = React.useState(true)
    return (
      <>
        <button type="button" onClick={() => setLoading(false)}>
          Done
        </button>
        <SkeletonGroup data-testid="region" loading={loading} label="Loading agent" fallback={<Skeleton />}>
          <p>Support triage</p>
        </SkeletonGroup>
      </>
    )
  }

  it('marks the region busy once and says what is loading, then hands over to the content', async () => {
    render(<Demo />)
    const region = screen.getByTestId('region')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Loading agent')
    expect(region.querySelectorAll('[aria-busy]')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(region).not.toHaveAttribute('aria-busy')
    // The status stays mounted, so the next load is announced.
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByText('Support triage')).toBeInTheDocument()
  })
})
