import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button, IconButton } from './button'

describe('Button', () => {
  it('renders a native button named by its label', () => {
    render(<Button>Run agent</Button>)
    expect(screen.getByRole('button', { name: 'Run agent' })).toBeInTheDocument()
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('while loading: busy, unpressable, but still focusable', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Deploy
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Deploy' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(button).toHaveFocus()
  })

  it('keeps the label when loading, so the width does not jump', () => {
    render(<Button loading>Deploy</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Deploy')
  })
})

describe('IconButton', () => {
  it('is named by its label, not its icon', () => {
    render(
      <IconButton label="Copy run id">
        <svg />
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Copy run id' })).toBeInTheDocument()
  })
})
