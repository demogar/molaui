import { render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'

import { Meter, Progress, meterLevel } from './progress'

describe('Progress', () => {
  it('is a progressbar named by its label', () => {
    render(<Progress label="Uploading" value={40} />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
  })

  it('is indeterminate when value is null', () => {
    render(<Progress label="Waiting" value={null} />)
    expect(screen.getByRole('progressbar', { name: 'Waiting' })).not.toHaveAttribute('aria-valuenow')
  })

  it('accepts custom value text', () => {
    render(<Progress label="Eval" value={212} max={300} valueText={(_, v) => `${v} / 300`} />)
    expect(screen.getByText('212 / 300')).toBeInTheDocument()
  })

  // The fill eases on `scale`, which the compositor moves, not on `width`,
  // which lays the bar out on every frame.
  it('fills by scaling the whole track, not by width', () => {
    const { container } = render(<Progress label="Eval" value={75} max={300} />)
    const fill = container.querySelector<HTMLElement>('[role=progressbar] [class*="transition-"]')!
    expect(fill.style.width).toBe('100%')
    expect(fill.style.scale).toBe('0.25 1')
    expect(fill.className).not.toMatch(/transition-\[width/)
  })
})

describe('Meter', () => {
  it('is a meter with its level exposed for styling', () => {
    render(<Meter label="Tokens" value={95} />)
    const meter = screen.getByRole('meter', { name: 'Tokens' })
    expect(meter).toHaveAttribute('aria-valuenow', '95')
    expect(meter).toHaveAttribute('data-level', 'danger')
  })

  it('fills by scaling the whole track, not by width', () => {
    const { container } = render(<Meter label="Tokens" value={40} min={20} max={60} />)
    const fill = container.querySelector<HTMLElement>('[role=meter] [class*="transition-"]')!
    expect(fill.style.width).toBe('100%')
    expect(fill.style.scale).toBe('0.5 1')
  })
})

describe('meterLevel', () => {
  it.each([
    [10, 'normal'],
    [75, 'warn'],
    [89, 'warn'],
    [90, 'danger'],
  ] as const)('%d of 100 is %s', (value, level) => {
    expect(meterLevel(value, { warn: 0.75, danger: 0.9 })).toBe(level)
  })

  it('respects min', () => {
    expect(meterLevel(15, { min: 10, max: 20, warn: 0.5 })).toBe('warn')
  })
})
