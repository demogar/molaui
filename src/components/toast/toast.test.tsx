import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

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
})
