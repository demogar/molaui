import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Placeholder } from './placeholder'

describe('Placeholder', () => {
  it('is one image named by its alt, not two lines of loose text', () => {
    render(<Placeholder label="Chart" name="Retention" alt="No data yet for retention" />)
    expect(screen.getByRole('img', { name: 'No data yet for retention' })).toBeInTheDocument()
  })
})
