import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Swatch } from './swatch'

describe('Swatch', () => {
  it('is hidden from assistive technology, so the label beside it carries the meaning', () => {
    render(
      <p>
        <Swatch tone="danger" />
        Urgent
      </p>,
    )
    const swatch = document.querySelector('[data-slot="swatch"]')
    expect(swatch).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Urgent')).toHaveTextContent(/^Urgent$/)
  })

  it('stays hidden even when a caller passes aria-hidden={false}', () => {
    render(<Swatch tone="info" aria-hidden={false} />)
    expect(document.querySelector('[data-slot="swatch"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is square by default and round only when asked', () => {
    const { rerender } = render(<Swatch />)
    const el = () => document.querySelector('[data-slot="swatch"]')!
    expect(el().className).toContain('rounded-none')
    rerender(<Swatch shape="round" />)
    expect(el().className).toContain('rounded-full')
  })

  it('takes its colour from the tone and its size from size', () => {
    render(<Swatch tone="warn" size="sm" />)
    const el = document.querySelector('[data-slot="swatch"]')!
    expect(el).toHaveAttribute('data-tone', 'warn')
    expect(el.className).toContain('bg-warn')
    expect(el.className).toContain('size-2')
  })
})
