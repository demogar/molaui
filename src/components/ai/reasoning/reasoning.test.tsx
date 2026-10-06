import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Reasoning } from './reasoning'

describe('Reasoning', () => {
  it('summarises in one line and stays closed by default', () => {
    render(<Reasoning text="Because." durationMs={12_400} />)
    const trigger = screen.getByRole('button', { name: 'Thought for 12.4s' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('says "Thinking" while the model is still thinking', async () => {
    render(<Reasoning text="Hmm" status="streaming" />)
    const trigger = screen.getByRole('button', { name: /Thinking/ })
    await userEvent.click(trigger)
    expect(screen.getByText('Hmm')).toBeInTheDocument()
  })
})
