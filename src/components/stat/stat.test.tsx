import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Stat, StatGroup } from './stat'

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
