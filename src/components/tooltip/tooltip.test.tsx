import { composeStories, setProjectAnnotations } from '@storybook/react-vite'
import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import * as preview from '../../../.storybook/preview'
import { Button } from '../button'
import { Tooltip } from './tooltip'
import * as stories from './tooltip.stories'

setProjectAnnotations(preview.default)
const { ToolbarGroup } = composeStories(stories)

describe('Tooltip', () => {
  // The story was a `div role="toolbar"` of buttons once: axe passed it, and
  // it had four tab stops and no arrow keys. This is the check axe cannot make.
  it('the toolbar story is one tab stop, and the arrow keys move between its buttons', async () => {
    const user = userEvent.setup()
    render(<ToolbarGroup />)
    expect(screen.getByRole('toolbar', { name: 'Run controls' })).toBeInTheDocument()
    const names = ['Start', 'Pause after this step', 'Stop run', 'Fork from here']
    await user.tab()
    expect(screen.getByRole('button', { name: names[0] })).toHaveFocus()
    for (const name of names.slice(1)) {
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('button', { name })).toHaveFocus()
    }
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: names[2] })).toHaveFocus()
    // One tab stop: Tab leaves the toolbar rather than visiting each button.
    await user.tab()
    expect(document.activeElement?.closest('[role="toolbar"]')).toBeNull()
  })

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

  it('hides on Escape', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Copy run id" delay={0}>
        <Button>Copy</Button>
      </Tooltip>,
    )
    await user.tab()
    expect(await screen.findByText('Copy run id')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Copy run id')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus()
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

  it('renders a repeated key twice without a duplicate React key', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Tooltip content="Reopen last run" shortcut={['⇧', '⇧']} defaultOpen>
        <Button>Reopen</Button>
      </Tooltip>,
    )
    const keys = (await screen.findByText('Reopen last run', { selector: 'span' })).parentElement!.querySelectorAll('kbd')
    expect([...keys].map((k) => k.textContent)).toEqual(['⇧', '⇧'])
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/same key/)
    error.mockRestore()
  })
})
