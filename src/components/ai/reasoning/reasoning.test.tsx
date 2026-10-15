import { render, screen } from '@/test/render'
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

  it('takes focus on its summary line, and Enter or Space opens and closes it', async () => {
    render(<Reasoning text="Checked both cohorts first." durationMs={2_000} />)
    const trigger = screen.getByRole('button', { name: 'Thought for 2.0s' })
    await userEvent.tab()
    expect(trigger).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Checked both cohorts first.')).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
