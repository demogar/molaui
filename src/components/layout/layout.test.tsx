import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Divider } from './divider'
import { Grid } from './grid'
import { Panel } from './panel'
import { SectionHeader } from './section'

describe('Panel', () => {
  it('redefines the ink ramp on a filled layer, not just the colour', () => {
    const { container } = render(<Panel tone="anil">x</Panel>)
    expect(container.firstElementChild!.className).toContain('on-layer')
  })

  it('gives an ink panel a cloth keyline, since an ink edge would vanish into it', () => {
    const { container } = render(<Panel tone="ink">x</Panel>)
    const cls = container.firstElementChild!.className
    expect(cls).toContain('keyline-on-ink')
    expect(cls).not.toMatch(/\bshadow-cut\b/)
  })
})

describe('Divider', () => {
  it('is silent by default', () => {
    const { container } = render(<Divider />)
    expect(container.firstElementChild).toHaveAttribute('role', 'none')
  })

  it('announces itself, with orientation, when told it is meaningful', () => {
    render(<Divider role="separator" orientation="vertical" />)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })
})

describe('SectionHeader', () => {
  it('puts the label after the heading in reading order', () => {
    const { container } = render(<SectionHeader title="Runs" label="Agent platform" />)
    const text = container.textContent ?? ''
    expect(text.indexOf('Runs')).toBeLessThan(text.indexOf('Agent platform'))
  })
})

describe('Grid', () => {
  it('passes the minimum cell width as a custom property', () => {
    const { container } = render(<Grid cols="auto" minItem="180px" />)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--grid-min')).toBe('180px')
  })
})
