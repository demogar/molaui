import { act, fireEvent, render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MessagesProvider } from '../../lib/messages'
import { ToastProvider, useToast } from './toast'

type Api = ReturnType<typeof useToast>
let api: Api

function Capture({ onReady }: { onReady: (api: Api) => void }) {
  const toast = useToast()
  useEffect(() => {
    onReady(toast)
  }, [toast, onReady])
  return null
}

function setup(props: { timeout?: number } = {}) {
  render(
    <ToastProvider {...props}>
      <Capture
        onReady={(a) => {
          api = a
        }}
      />
    </ToastProvider>,
  )
}

describe('Toast', () => {
  it('shows a title and description, with the tone in words for screen readers', async () => {
    setup()
    act(() => {
      api.error({ title: 'Deploy failed', description: 'Timed out' })
    })
    expect((await screen.findAllByText(/Deploy failed/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Error:')[0]).toHaveClass('sr-only')
    expect(screen.getAllByText('Timed out').length).toBeGreaterThan(0)
  })

  // The polite viewport read a danger toast as it was added, and Base UI's
  // hidden alert read it again. A card is live through exactly one region.
  it('announces a danger toast once, through the alert, and others through the polite region', async () => {
    setup()
    act(() => {
      api.error({ title: 'Deploy failed' })
      api.success({ title: 'Index rebuilt' })
    })
    const live = async (title: RegExp) => {
      const card = (await screen.findAllByText(title)).find((el) => el.closest('[data-slot="toast"]'))
      return card?.closest('[aria-live]')?.getAttribute('aria-live')
    }
    expect(await live(/Deploy failed/)).toBe('off')
    expect(await live(/Index rebuilt/)).toBe('polite')
    expect(screen.getByRole('alert')).toHaveTextContent('Deploy failed')
  })

  it('updates a running toast in place', async () => {
    setup()
    let id = ''
    act(() => {
      id = api.running({ title: 'Re-indexing' })
    })
    await screen.findByText('Re-indexing')
    act(() => api.update(id, { tone: 'success', title: 'Index rebuilt' }))
    expect(await screen.findByText('Index rebuilt')).toBeInTheDocument()
    expect(screen.queryByText('Re-indexing')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Index rebuilt/)).toHaveLength(1)
  })

  it('names its Dismiss button before focus enters the region', async () => {
    // Base UI aria-hides the close button until the stack is expanded or the
    // button is focused. Ours is always drawn, so it must always be named: a
    // screen reader browsing the page, and a test, find it without first
    // moving focus into the toast.
    //
    // A danger toast is the exception, and Base UI's on purpose: it is high
    // priority, read out at once by an assertive live region, and the whole
    // toast stays aria-hidden until it is focused so it is not read twice.
    // F6 reaches it, and then its Dismiss is named like the others.
    setup()
    act(() => {
      api.show({ title: 'Draft saved' })
      api.warn({ title: 'Spend at 80%' })
    })
    await screen.findAllByText(/Draft saved/)
    expect(document.activeElement).toBe(document.body)
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(2)
  })

  it('runs the action and can be dismissed', async () => {
    setup()
    let undone = false
    act(() => {
      api.show({ title: 'Archived', action: { label: 'Undo', onClick: () => (undone = true) } })
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(undone).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByText('Archived')).not.toBeInTheDocument())
  })

  /**
   * The keyboard table on the page: F6 into the region, Tab through it, Enter
   * and Space on its buttons, Escape on a toast, and Shift+Tab back out to
   * where focus was.
   */
  describe('keyboard', () => {
    function setupWithStart() {
      render(
        <ToastProvider>
          <button type="button">Start</button>
          <Capture
            onReady={(a) => {
              api = a
            }}
          />
        </ToastProvider>,
      )
    }

    it('F6 moves focus to the region; Tab moves through the toast; Enter and Space press its buttons', async () => {
      const user = userEvent.setup()
      setupWithStart()
      let undone = false
      act(() => {
        api.show({ title: 'Archived', timeout: 0, action: { label: 'Undo', onClick: () => (undone = true) } })
      })
      await screen.findByRole('button', { name: 'Undo' })
      screen.getByRole('button', { name: 'Start' }).focus()
      await user.keyboard('{F6}')
      const toast = screen.getByText('Archived').closest('[data-slot="toast"]') as HTMLElement
      const region = toast.parentElement!
      expect(region.contains(document.activeElement)).toBe(true)
      const undo = screen.getByRole('button', { name: 'Undo' })
      const dismiss = screen.getByRole('button', { name: 'Dismiss' })
      // Tab from the region lands in the toast, then on each of its buttons.
      for (let i = 0; i < 4 && document.activeElement !== undo; i++) await user.tab()
      expect(undo).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(undone).toBe(true)
      dismiss.focus()
      await user.keyboard(' ')
      await waitFor(() => expect(screen.queryByText('Archived')).not.toBeInTheDocument())
    })

    it('Escape closes the toast that has focus', async () => {
      const user = userEvent.setup()
      setupWithStart()
      act(() => {
        api.show({ title: 'Settings saved', timeout: 0 })
      })
      await screen.findByText('Settings saved')
      screen.getByRole('button', { name: 'Start' }).focus()
      await user.keyboard('{F6}')
      const toast = screen.getByText('Settings saved').closest('[data-slot="toast"]') as HTMLElement
      for (let i = 0; i < 4 && !toast.contains(document.activeElement); i++) await user.tab()
      expect(toast.contains(document.activeElement)).toBe(true)
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByText('Settings saved')).not.toBeInTheDocument())
    })

    it('Shift+Tab from the start of the region returns focus to where it was', async () => {
      const user = userEvent.setup()
      setupWithStart()
      act(() => {
        api.show({ title: 'Settings saved', timeout: 0 })
      })
      await screen.findByText('Settings saved')
      const start = screen.getByRole('button', { name: 'Start' })
      start.focus()
      await user.keyboard('{F6}')
      expect(start).not.toHaveFocus()
      await user.tab({ shift: true })
      expect(start).toHaveFocus()
    })

    it('F6 pauses the timers while the region has focus', () => {
      vi.useFakeTimers()
      try {
        setupWithStart()
        act(() => {
          api.show({ title: 'Settings saved' })
        })
        const start = screen.getByRole('button', { name: 'Start' })
        start.focus()
        // user-event's own delays hang on a fake clock, so the key is fired directly.
        fireEvent.keyDown(start, { key: 'F6' })
        expect(start).not.toHaveFocus()
        act(() => {
          vi.advanceTimersByTime(20_000)
        })
        expect(screen.getByText('Settings saved')).toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  /**
   * The timers, on a fake clock. Each is a promise the doc comment makes —
   * a running toast does not time out, a result starts its timeout, pause on
   * hover, three at once — and none of them shows in a screenshot.
   */
  describe('timers', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    // Inside act, so the timeout's close and the exit after it are both
    // committed before the next assertion.
    const advance = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms)
      })
    const stackOf = (title: string) => screen.getByText(title).closest('[data-slot="toast"]')!.parentElement!

    it('never times out a running toast', () => {
      vi.useFakeTimers()
      setup()
      act(() => {
        api.running({ title: 'Re-indexing 1,204 documents' })
      })
      advance(10 * 60_000)
      expect(screen.getByText('Re-indexing 1,204 documents')).toBeInTheDocument()
    })

    it('starts the 5s timeout when a running toast becomes a result', () => {
      vi.useFakeTimers()
      setup()
      let id = ''
      act(() => {
        id = api.running({ title: 'Re-indexing' })
      })
      advance(60_000)
      act(() => api.update(id, { tone: 'success', title: 'Index rebuilt' }))
      advance(4_900)
      expect(screen.getByText('Index rebuilt')).toBeInTheDocument()
      advance(1_000)
      expect(screen.queryByText('Index rebuilt')).not.toBeInTheDocument()
    })

    it("uses the provider's timeout, not a fixed 5s, when a running toast becomes a result", () => {
      vi.useFakeTimers()
      setup({ timeout: 8_000 })
      let id = ''
      act(() => {
        id = api.running({ title: 'Re-indexing' })
      })
      act(() => api.update(id, { tone: 'success', title: 'Index rebuilt' }))
      advance(7_000)
      expect(screen.getByText('Index rebuilt')).toBeInTheDocument()
      advance(2_000)
      expect(screen.queryByText('Index rebuilt')).not.toBeInTheDocument()
    })

    it('keeps a running toast open when only its words change', () => {
      vi.useFakeTimers()
      setup()
      let id = ''
      act(() => {
        id = api.running({ title: 'Re-indexing', description: '12 of 1,204 documents' })
      })
      act(() => api.update(id, { description: '812 of 1,204 documents' }))
      advance(10 * 60_000)
      expect(screen.getByText('812 of 1,204 documents')).toBeInTheDocument()
    })

    it('pauses the timeout while the pointer is over the stack', () => {
      vi.useFakeTimers()
      setup()
      act(() => {
        api.show({ title: 'Settings saved' })
      })
      fireEvent.mouseEnter(stackOf('Settings saved'))
      advance(20_000)
      expect(screen.getByText('Settings saved')).toBeInTheDocument()
      fireEvent.mouseLeave(stackOf('Settings saved'))
      advance(6_000)
      expect(screen.queryByText('Settings saved')).not.toBeInTheDocument()
    })

    it('keeps three toasts in view and folds the oldest away', () => {
      vi.useFakeTimers()
      setup()
      act(() => {
        for (const n of [1, 2, 3, 4]) api.show({ title: `Run ${n} finished`, timeout: 0 })
      })
      const limited = (n: number) =>
        screen.getByText(`Run ${n} finished`).closest('[data-slot="toast"]')!.hasAttribute('data-limited')
      expect([1, 2, 3, 4].map(limited)).toEqual([true, false, false, false])
    })
  })
})

// Base UI names the viewport "Notifications" in its own defaults, out of the
// messages gate's sight, so the precedence is held here (#182).
describe('Toast region name', () => {
  it('is "Notifications" with no provider', () => {
    render(<ToastProvider>{null}</ToastProvider>)
    expect(screen.getByRole('region')).toHaveAccessibleName('Notifications')
  })

  it('takes the name from a MessagesProvider above it', () => {
    render(
      <MessagesProvider messages={{ toast: { region: 'Notificaciones' } }}>
        <ToastProvider>{null}</ToastProvider>
      </MessagesProvider>,
    )
    expect(screen.getByRole('region')).toHaveAccessibleName('Notificaciones')
  })

  it('lets the messages prop beat the provider', () => {
    render(
      <MessagesProvider messages={{ toast: { region: 'Notificaciones' } }}>
        <ToastProvider messages={{ region: 'Avisos' }}>{null}</ToastProvider>
      </MessagesProvider>,
    )
    expect(screen.getByRole('region')).toHaveAccessibleName('Avisos')
  })
})
