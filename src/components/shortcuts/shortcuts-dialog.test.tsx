import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import type * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommandPalette } from '../command'
import { ToastProvider } from '../toast'
import { type HotkeyPlatform } from './hotkeys'
import { ShortcutsDialog } from './shortcuts-dialog'
import { HotkeysProvider, SEQUENCE_MS, useHotkeys, type UseHotkeysOptions, useRegisteredHotkeys } from './use-hotkeys'

afterEach(() => {
  vi.useRealTimers()
})

function Bind({ keys, handler, ...options }: { keys: string; handler: ((e: KeyboardEvent) => void) | null } & UseHotkeysOptions) {
  useHotkeys(keys, handler, options)
  return null
}

function Listed() {
  const entries = useRegisteredHotkeys()
  return <output data-testid="listed">{entries.map((e) => `${e.keys}:${e.label}`).join('|')}</output>
}

const page = (children: React.ReactNode, platform: HotkeyPlatform = 'other') => (
  <HotkeysProvider platform={platform}>
    {children}
    <input aria-label="Notes" />
    <Listed />
  </HotkeysProvider>
)

describe('useHotkeys', () => {
  it('follows the platform: mod is ⌘ on a Mac and Ctrl elsewhere, never both', async () => {
    const user = userEvent.setup()
    const onMac = vi.fn()
    const { unmount } = render(page(<Bind keys="mod+k" handler={onMac} label="Open" />, 'apple'))
    await user.keyboard('{Meta>}k{/Meta}')
    await user.keyboard('{Control>}k{/Control}')
    expect(onMac).toHaveBeenCalledTimes(1)
    unmount()

    const elsewhere = vi.fn()
    render(page(<Bind keys="mod+k" handler={elsewhere} label="Open" />, 'other'))
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('{Meta>}k{/Meta}')
    expect(elsewhere).toHaveBeenCalledTimes(1)
  })

  it('never takes a plain key typed into a field, but lets a ⌘/Ctrl chord through', async () => {
    const user = userEvent.setup()
    const plain = vi.fn()
    const chord = vi.fn()
    render(
      page(
        <>
          <Bind keys="n" handler={plain} label="New" />
          <Bind keys="mod+k" handler={chord} label="Palette" />
        </>,
      ),
    )
    await user.click(screen.getByRole('textbox', { name: 'Notes' }))
    await user.keyboard('n')
    expect(plain).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('n')
    await user.keyboard('{Control>}k{/Control}')
    expect(chord).toHaveBeenCalledOnce()
    act(() => (document.activeElement as HTMLElement).blur())
    await user.keyboard('n')
    expect(plain).toHaveBeenCalledOnce()
  })

  it('ignores keys during IME composition, key repeat and keys already handled', () => {
    const handler = vi.fn()
    render(page(<Bind keys="n" handler={handler} label="New" />))
    fireEvent.keyDown(document.body, { key: 'n', isComposing: true })
    fireEvent.keyDown(document.body, { key: 'n', keyCode: 229 })
    fireEvent.keyDown(document.body, { key: 'n', repeat: true })
    const handled = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true })
    handled.preventDefault()
    document.body.dispatchEvent(handled)
    expect(handler).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('runs a sequence typed in order within the window, and not a late second key', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const handler = vi.fn()
    render(page(<Bind keys="g d" handler={handler} label="Go to documents" />))
    await user.keyboard('gd')
    expect(handler).toHaveBeenCalledOnce()
    await user.keyboard('g')
    act(() => vi.advanceTimersByTime(SEQUENCE_MS + 10))
    await user.keyboard('d')
    expect(handler).toHaveBeenCalledOnce()
    await user.keyboard('xgd')
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('lists what it binds, lists a null handler without binding it, and unlists a disabled one', () => {
    const { rerender } = render(
      page(
        <>
          <Bind keys="Control+K" handler={() => {}} label="Open the command palette" />
          <Bind keys="f6" handler={null} label="Move focus to new notifications" />
          <Bind keys="n" handler={() => {}} label="New" enabled={false} />
        </>,
      ),
    )
    expect(screen.getByTestId('listed')).toHaveTextContent('ctrl+k:Open the command palette|f6:Move focus to new notifications')
    rerender(page(null))
    expect(screen.getByTestId('listed')).toBeEmptyDOMElement()
  })

  it('warns in development when two live bindings share a key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      page(
        <>
          <Bind keys="g r" handler={() => {}} label="Go to runs" />
          <Bind keys="g  r" handler={() => {}} label="Go to reports" />
        </>,
      ),
    )
    expect(warn.mock.calls.flat().join(' ')).toMatch(/"g r" is bound twice: “Go to runs” and “Go to reports”/)
    warn.mockRestore()
  })
})

describe('ShortcutsDialog', () => {
  it('opens on ?, lists every registered shortcut by group with its keys in words, and closes on Escape', async () => {
    const user = userEvent.setup()
    render(
      <HotkeysProvider platform="other">
        <ToastProvider>
          <Bind keys="shift+r" handler={() => {}} label="Refresh the table" group="Runs" />
          <CommandPalette
            open={false}
            onOpenChange={() => {}}
            groups={[{ heading: 'Go to', items: [{ id: 'docs', label: 'Documents', hotkey: 'g d', onSelect() {} }] }]}
          />
          <ShortcutsDialog />
        </ToastProvider>
      </HotkeysProvider>,
    )
    await user.keyboard('?')
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    const general = within(dialog).getByRole('heading', { name: 'General' })
    expect(general).toBeInTheDocument()
    // General first; then the groups in the order they were bound.
    expect(within(dialog).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['General', 'Runs', 'Go to'])
    expect(dialog).toHaveTextContent('Move focus to new notifications')
    expect(dialog).toHaveTextContent('Show keyboard shortcuts')
    const refresh = within(dialog).getByText('Refresh the table').closest('div')!
    expect(refresh).toHaveTextContent('Shift R')
    expect(within(dialog).getByText('Documents').closest('div')).toHaveTextContent('G, then D')
    // Focus stays inside: Base UI's guards hand it back from either end.
    await user.tab()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await user.tab({ shift: true })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens from its trigger and returns focus there', async () => {
    const user = userEvent.setup()
    render(
      <HotkeysProvider platform="apple">
        <Bind keys="mod+k" handler={() => {}} label="Open the command palette" />
        <ShortcutsDialog trigger={<button type="button">Shortcuts</button>} />
      </HotkeysProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Shortcuts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(dialog).getByText('Open the command palette').closest('div')).toHaveTextContent('Command K')
    expect(within(dialog).getByText('⌘')).toHaveAttribute('data-slot', 'kbd')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Shortcuts' })).toHaveFocus())
  })

  it('binds no ? with hotkey={false}, and says when nothing is bound', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <HotkeysProvider>
        <ShortcutsDialog hotkey={false} />
      </HotkeysProvider>,
    )
    await user.keyboard('?')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()
    render(
      <HotkeysProvider>
        <ShortcutsDialog hotkey={false} defaultOpen />
      </HotkeysProvider>,
    )
    expect(await screen.findByText('No keyboard shortcuts are bound on this page.')).toBeInTheDocument()
  })
})
