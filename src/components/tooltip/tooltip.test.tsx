import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Button } from '../button'
import { Tooltip } from './tooltip'

describe('Tooltip', () => {
  it('appears on keyboard focus, not only on hover', async () => {
    render(
      <Tooltip content="Copy run id" delay={0}>
        <Button>Copy</Button>
      </Tooltip>,
    )
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus()
    expect(await screen.findByText('Copy run id')).toBeInTheDocument()
  })

  it('renders shortcut keys as <kbd>', async () => {
    render(
      <Tooltip content="Search" shortcut={['⌘', 'K']} defaultOpen>
        <Button>Search</Button>
      </Tooltip>,
    )
    const keys = (await screen.findByText('Search', { selector: 'span' })).parentElement!.querySelectorAll('kbd')
    expect([...keys].map((k) => k.textContent)).toEqual(['⌘', 'K'])
  })
})
