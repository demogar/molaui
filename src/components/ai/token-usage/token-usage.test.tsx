import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TokenUsage, contextLevel } from './token-usage'

describe('contextLevel', () => {
  it.each([
    [0.5, 'ok'],
    [0.8, 'warn'],
    [0.95, 'danger'],
  ])('%f → %s', (ratio, level) => {
    expect(contextLevel(ratio)).toBe(level)
  })
})

describe('TokenUsage', () => {
  it('exposes the context window as a meter', () => {
    render(<TokenUsage input={50_000} output={0} contextWindow={200_000} />)
    expect(screen.getByRole('meter', { name: 'Context window used' })).toHaveAttribute('aria-valuenow', '25')
  })

  it('says "near the limit" in words, not only in gold', () => {
    render(<TokenUsage input={170_000} output={0} contextWindow={200_000} />)
    expect(screen.getByText('Near the limit')).toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', expect.stringContaining('near the limit'))
  })
})
