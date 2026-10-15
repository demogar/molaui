import { render, renderHook, screen } from '@/test/render'
import type * as React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AvatarGroup, Avatar } from '../components/avatar'
import { Dialog, DialogContent } from '../components/dialog'
import { Pagination } from '../components/pagination'
import { commandPaletteMessages } from '../components/command/messages'
import { formatMessage, MessagesProvider, useMessages } from './messages'

const noop = () => {}

describe('MessagesProvider', () => {
  it('reaches a dialog rendered into a portal', async () => {
    render(
      <MessagesProvider messages={{ dialog: { close: 'Cerrar' } }}>
        <Dialog defaultOpen>
          <DialogContent title="Renombrar">cuerpo</DialogContent>
        </Dialog>
      </MessagesProvider>,
    )
    expect(await screen.findByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('is optional: without one, every component speaks English', () => {
    render(<Pagination page={2} pageCount={5} onPageChange={noop} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
  })

  it('a component’s own messages win over the provider, and a key left out keeps the provider’s', () => {
    render(
      <MessagesProvider messages={{ pagination: { previous: 'Anterior', next: 'Siguiente' } }}>
        <Pagination page={2} pageCount={5} onPageChange={noop} messages={{ next: 'Más' }} />
      </MessagesProvider>,
    )
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Más' })).toBeInTheDocument()
  })

  it('nested providers merge, so a section can reword one key', () => {
    render(
      <MessagesProvider messages={{ pagination: { previous: 'Anterior', next: 'Siguiente' } }}>
        <MessagesProvider messages={{ pagination: { next: 'Adelante' } }}>
          <Pagination page={2} pageCount={5} onPageChange={noop} />
        </MessagesProvider>
      </MessagesProvider>,
    )
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adelante' })).toBeInTheDocument()
  })

  it('writes counts in its locale, on the server and in the browser alike', () => {
    const page = (
      <MessagesProvider locale="es-ES" messages={{ pagination: { rangeOf: '{range} de {total}' } }}>
        <Pagination variant="compact" page={2} pageCount={600} pageSize={25} total={12840} onPageChange={noop} />
      </MessagesProvider>
    )
    expect(renderToString(page).replace(/<[^>]+>/g, '')).toContain('26–50 de 12.840')
    render(page)
    expect(screen.getByText(/de 12\.840/)).toHaveTextContent('26–50 de 12.840')
  })

  it('a plural is replaced whole: a translation with only `other` does not inherit English `one`', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MessagesProvider messages={{ commandPalette: { results: { other: '{count} resultados' } } }}>{children}</MessagesProvider>
    )
    const { result } = renderHook(() => useMessages('commandPalette', commandPaletteMessages), { wrapper })
    const [t, f] = result.current
    expect(f.plural(t.results, 1)).toBe('1 resultados')
  })

  it('shows the AvatarGroup count tile in the provider’s words', () => {
    render(
      <MessagesProvider messages={{ avatarGroup: { more: { one: 'otra persona', other: '{count} personas más' } } }}>
        <AvatarGroup label="Revisores" max={1}>
          <Avatar name="Ana Ruiz" />
          <Avatar name="Luis Pérez" />
          <Avatar name="Rosa Díaz" />
        </AvatarGroup>
      </MessagesProvider>,
    )
    expect(screen.getByRole('img', { name: '2 personas más' })).toBeInTheDocument()
  })
})

describe('formatMessage', () => {
  it('fills named placeholders and leaves unknown ones as written', () => {
    expect(formatMessage('Step {position} of {total}', { position: 2, total: 4 })).toBe('Step 2 of 4')
    expect(formatMessage('Hola {name}', {})).toBe('Hola {name}')
  })
})
