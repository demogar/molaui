import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

function setup() {
  render(
    <ToastProvider>
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
