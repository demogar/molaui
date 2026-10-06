import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge, RecommendationBadge, StatusDot } from './badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge tone="success">Succeeded</Badge>)
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
  })

  it('renders a decorative dot that adds nothing to the name', () => {
    const { container } = render(
      <Badge tone="info" dot>
        Running
      </Badge>,
    )
    const dot = container.querySelector('[data-slot="status-dot"]')
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })

  it('pulses the dot only when asked', () => {
    const { container } = render(
      <Badge tone="info" dot pulse>
        Streaming
      </Badge>,
    )
    expect(container.querySelector('[data-slot="status-dot"]')?.className).toContain('animate-mola-pulse')
  })
})

describe('StatusDot', () => {
  it('is announced when it stands alone with a label', () => {
    render(<StatusDot tone="danger" label="Failed" />)
    expect(screen.getByRole('img', { name: 'Failed' })).toBeInTheDocument()
  })
})

describe('RecommendationBadge', () => {
  it('falls back to the editorial label for its level', () => {
    render(<RecommendationBadge level="detour" />)
    expect(screen.getByText('Worth the detour')).toBeInTheDocument()
  })
})
