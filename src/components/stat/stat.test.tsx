import { render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'

import { Sparkline, Stat, StatGroup } from './stat'

describe('Stat', () => {
  it('is a term and its value', () => {
    render(<Stat label="Runs today" value="1,204" />)
    expect(screen.getByRole('term')).toHaveTextContent('Runs today')
    expect(screen.getByRole('definition')).toHaveTextContent('1,204')
  })

  it('says direction and sentiment in words, not only in colour', () => {
    render(
      <Stat
        label="p95 latency"
        value="2.4"
        unit="s"
        delta={{ value: '0.3s', direction: 'up', sentiment: 'negative', period: 'vs last week' }}
      />,
    )
    expect(screen.getByText('Up 0.3s, vs last week, a regression')).toHaveClass('sr-only')
  })

  it('shares one <dl> across a group', () => {
    const { container } = render(
      <StatGroup>
        <Stat label="A" value="1" />
        <Stat label="B" value="2" />
      </StatGroup>,
    )
    expect(container.querySelectorAll('dl')).toHaveLength(1)
    expect(screen.getAllByRole('term')).toHaveLength(2)
  })
})

describe('Sparkline', () => {
  const coordinates = (container: HTMLElement) => [
    ...(container.querySelector('polyline')?.getAttribute('points') ?? '').split(/[ ,]/),
    ...['x', 'y'].map((a) => container.querySelector('rect')?.getAttribute(a) ?? ''),
  ]

  it('draws one value as the "now" square at the end, with no NaN', () => {
    const { container } = render(<Sparkline values={[42]} width={72} height={24} />)
    const values = coordinates(container)
    expect(values.every((v) => Number.isFinite(Number(v)))).toBe(true)
    expect(container.querySelector('rect')).toHaveAttribute('x', String(72 - 3 - 2.5))
  })

  it('draws nothing for no values', () => {
    const { container } = render(<Sparkline values={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('spreads several values from edge to edge', () => {
    const { container } = render(<Sparkline values={[1, 3, 2]} width={72} height={24} />)
    expect(container.querySelector('polyline')).toHaveAttribute('points', '3.0,21.0 36.0,3.0 69.0,12.0')
  })
})
