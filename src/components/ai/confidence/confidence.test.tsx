import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Confidence, UncertaintyNote } from './confidence'

describe('Confidence', () => {
  it('says the level in words and never as a percentage', () => {
    const { container } = render(<Confidence level="low" basis="single source" />)
    expect(screen.getByText('Low confidence')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/%/)
  })
})

describe('UncertaintyNote', () => {
  it('is a named complementary note', () => {
    render(<UncertaintyNote title="Unverified figure">Check it.</UncertaintyNote>)
    expect(screen.getByRole('complementary', { name: 'Unverified figure' })).toBeInTheDocument()
  })
})
