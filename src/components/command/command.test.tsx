import { render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { type CommandGroup, CommandPalette, filterCommands, useCommandShortcut } from './command'

const make = (onSelect: () => void = vi.fn()): CommandGroup[] => [
  {
    heading: 'Actions',
    items: [
      { id: 'run', label: 'Start a new run', keywords: ['execute'], onSelect },
      { id: 'purge', label: 'Purge index', disabled: true, onSelect },
      { id: 'theme', label: 'Toggle theme', onSelect },
    ],
  },
  { heading: 'Go to', items: [{ id: 'settings', label: 'Settings', onSelect }] },
]

describe('filterCommands', () => {
  it('matches every word across label and keywords', () => {
    const result = filterCommands(make(), 'new execute')
    expect(result.flatMap((g) => g.items.map((i) => i.id))).toEqual(['run'])
  })
  it('drops empty groups', () => {
    expect(filterCommands(make(), 'settings').map((g) => g.heading)).toEqual(['Go to'])
  })
  it('ranks label-prefix matches first', () => {
    const groups: CommandGroup[] = [
      { heading: 'x', items: [{ id: 'a', label: 'Open theme', onSelect() {} }, { id: 'b', label: 'Theme', onSelect() {} }] },
    ]
    expect(filterCommands(groups, 'theme')[0]!.items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

function Harness({ onSelect }: { onSelect: () => void }) {
  const [open, setOpen] = useState(true)
  return <CommandPalette open={open} onOpenChange={setOpen} groups={make(onSelect)} />
}

// The palette has no trigger of its own; apps open it from a button as well as
// from ⌘K, and the keystroke that pressed the button must not also dismiss it.
function ButtonHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(true)}>
        Commands
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} groups={make()} />
    </>
  )
}

describe('CommandPalette', () => {
  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('opens from a button pressed with %s and stays open', async (_name, key) => {
    render(<ButtonHarness />)
    screen.getByRole('button', { name: 'Commands' }).focus()
    await userEvent.keyboard(key)
    const dialog = await screen.findByRole('dialog', { name: 'Command palette' })
    // Past the keystroke, so a popup that opened and was dismissed by the same key would show.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(dialog).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus())
  })

  it('wires the combobox to the listbox and highlights the first match', async () => {
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    const listbox = screen.getByRole('listbox')
    expect(input).toHaveAttribute('aria-controls', listbox.id)
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Start a new run' }).id)
  })

  it('skips disabled options with the arrow keys, wraps, and selects with Enter', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Toggle theme' }).id)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Start a new run' }).id)
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument())
  })

  it('filters as you type and shows an empty state', async () => {
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    await userEvent.type(input, 'sett')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await userEvent.type(input, 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText(/No matches for/)).toBeInTheDocument()
    // No empty listbox: the combobox reports itself collapsed instead.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).not.toHaveAttribute('aria-controls')
  })

  it('names each group by its heading, including headings with spaces', async () => {
    render(<Harness onSelect={() => {}} />)
    await screen.findByRole('combobox')
    expect(screen.getByRole('group', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Go to' })).toBeInTheDocument()
  })

  it('announces the result count, and no matches, in a polite status after typing pauses', async () => {
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    // Nothing is said on open: an empty query is not a search.
    expect(status).toHaveTextContent(/^$/)
    await userEvent.type(input, 't')
    await waitFor(() => expect(status).toHaveTextContent('3 results'))
    await userEvent.type(input, 'heme')
    await waitFor(() => expect(status).toHaveTextContent(/^1 result$/))
    await userEvent.type(input, 'zzz')
    await waitFor(() => expect(status).toHaveTextContent('No matches for “themezzz”.'))
  })
})

describe('useCommandShortcut', () => {
  function Probe({ onTrigger }: { onTrigger: () => void }) {
    useCommandShortcut(onTrigger)
    return null
  }
  it('fires on Ctrl-K and ⌘K', async () => {
    const onTrigger = vi.fn()
    render(<Probe onTrigger={onTrigger} />)
    await userEvent.keyboard('{Control>}k{/Control}')
    await userEvent.keyboard('{Meta>}k{/Meta}')
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })

  it('renders a repeated shortcut key twice without a duplicate React key', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const groups: CommandGroup[] = [
      { heading: 'Go to', items: [{ id: 'runs', label: 'Runs', shortcut: ['G', 'G'], onSelect() {} }] },
    ]
    render(<CommandPalette open onOpenChange={() => {}} groups={groups} />)
    const option = await screen.findByRole('option', { name: /Runs/ })
    expect(option.textContent).toContain('GG')
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/same key/)
    error.mockRestore()
  })
})

describe('CommandPalette keyboard', () => {
  it('moves the highlight up with ArrowUp, wrapping from the first command to the last', async () => {
    const user = userEvent.setup()
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await user.keyboard('{ArrowUp}')
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Settings' }).id)
    await user.keyboard('{ArrowUp}')
    // Purge index is disabled, so ArrowUp from Settings lands on Toggle theme.
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Toggle theme' }).id)
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    render(<Harness onSelect={() => {}} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument())
  })
})

describe('CommandPalette, uncontrolled', () => {
  it('opens from its own trigger, closes on a choice and opens again', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<CommandPalette trigger={<button type="button">Commands</button>} groups={make(onSelect)} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Commands' }))
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Commands' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('starts open with defaultOpen and reports changes without needing state', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<CommandPalette defaultOpen onOpenChange={onOpenChange} groups={make()} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('puts className, ref and data-* on the dialog popup', async () => {
    const ref = { current: null as HTMLDivElement | null }
    render(<CommandPalette defaultOpen groups={make()} className="probe" data-testid="palette" ref={ref} />)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-testid', 'palette')
    expect(dialog).toHaveClass('probe')
    expect(ref.current).toBe(dialog)
  })
})
