import { render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'

import { Badge, RecommendationBadge, StatusDot, type BadgeTone } from './badge'

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
    expect(container.querySelector('[data-slot="status-dot"]')?.getAttribute('class')).toContain('animate-mola-pulse')
  })
})

describe('StatusDot', () => {
  const TONES: BadgeTone[] = ['neutral', 'info', 'success', 'warn', 'danger', 'accent']

  // Every tone drew the same filled square once, so "Failed" and "Succeeded"
  // in a runs table differed only in hue (SC 1.4.1), and warn and accent were
  // the same gold mark. The shape is compared, not just the name of it.
  it('cuts every tone as a different shape', () => {
    const shapes = TONES.map((tone) => {
      const { container, unmount } = render(<StatusDot tone={tone} />)
      const svg = container.querySelector('[data-slot="status-dot"] svg')!
      // Geometry, and whether each part is filled or left hollow — hue is
      // deliberately not part of the signature.
      const geometry = [...svg.children].map((el) => {
        const own = (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => !c.includes(':'))
        const filled = own.some((c) => c.startsWith('fill-') && c !== 'fill-none') ? 'filled' : 'open'
        return [el.tagName, filled, ...['x', 'y', 'width', 'height', 'd'].map((a) => el.getAttribute(a) ?? '')].join(' ')
      })
      unmount()
      return geometry.join(' | ')
    })
    expect(new Set(shapes).size).toBe(TONES.length)
  })

  it('keeps the shape on a solid badge, where the hue is the ground', () => {
    const { container } = render(
      <Badge tone="danger" variant="solid" dot>
        Failed
      </Badge>,
    )
    expect(container.querySelector('[data-slot="status-dot"]')).toHaveAttribute('data-glyph', 'crossed')
    expect(container.querySelector('[data-slot="badge"]')).toHaveAttribute('data-variant', 'solid')
  })


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
