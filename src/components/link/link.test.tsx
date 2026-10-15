import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MessagesProvider } from '../../lib/messages'
import { Link, LinkButton } from './link'

describe('Link', () => {
  it('is an anchor named by its text, underlined inline and bare when standalone', () => {
    render(
      <>
        <Link href="/runs">run history</Link>
        <Link href="/all" variant="standalone">
          View all runs
        </Link>
      </>,
    )
    const inline = screen.getByRole('link', { name: 'run history' })
    expect(inline).toHaveAttribute('href', '/runs')
    expect(inline).toHaveClass('underline')
    expect(screen.getByRole('link', { name: 'View all runs' })).toHaveClass('no-underline')
  })

  it('external opens a new tab safely and says so in the accessible name', () => {
    render(
      <Link href="https://example.org" external>
        Guidelines
      </Link>,
    )
    const link = screen.getByRole('link', { name: 'Guidelines (opens in a new tab)' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('target="_blank" given directly gets the same cue, and a rel of your own is kept', () => {
    render(
      <Link href="https://example.org" target="_blank" rel="noopener">
        Guidelines
      </Link>,
    )
    const link = screen.getByRole('link', { name: 'Guidelines (opens in a new tab)' })
    expect(link).toHaveAttribute('rel', 'noopener')
  })

  it('reads the new-tab cue from MessagesProvider', () => {
    render(
      <MessagesProvider messages={{ link: { newTab: '(se abre en una pestaña nueva)' } }}>
        <Link href="https://example.org" external>
          Pautas
        </Link>
      </MessagesProvider>,
    )
    expect(screen.getByRole('link', { name: 'Pautas (se abre en una pestaña nueva)' })).toBeInTheDocument()
  })

  it('renders your router’s link through render, as an element or a function, with ref and handlers merged', async () => {
    const navigate = vi.fn()
    const RouterAnchor = ({ to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
      <a
        {...props}
        href={to}
        onClick={(event) => {
          props.onClick?.(event)
          event.preventDefault()
          navigate(to)
        }}
      />
    )
    const ref = React.createRef<HTMLAnchorElement>()
    const onClick = vi.fn()
    render(
      <>
        <Link ref={ref} onClick={onClick} render={(props) => <RouterAnchor {...props} to="/runs/4182" />}>
          Run #4182
        </Link>
        <LinkButton render={<RouterAnchor to="/agents" />}>Open agents</LinkButton>
      </>,
    )
    const run = screen.getByRole('link', { name: 'Run #4182' })
    expect(ref.current).toBe(run)
    expect(run).toHaveAttribute('data-slot', 'link')
    await userEvent.click(run)
    expect(onClick).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenLastCalledWith('/runs/4182')
    await userEvent.click(screen.getByRole('link', { name: 'Open agents' }))
    expect(navigate).toHaveBeenLastCalledWith('/agents')
  })

  // The keys are written out so the keyboard-table gate can see them pressed.
  it('Tab reaches it and Enter follows it', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault())
    render(
      <Link href="/runs" onClick={onClick}>
        run history
      </Link>,
    )
    await userEvent.keyboard('{Tab}')
    expect(screen.getByRole('link', { name: 'run history' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('LinkButton', () => {
  it('is a link, not a button, cut like a Button', () => {
    render(
      <LinkButton href="/runs/4182" variant="secondary" withArrow>
        Open run
      </LinkButton>,
    )
    const link = screen.getByRole('link', { name: 'Open run' })
    expect(screen.queryByRole('button')).toBeNull()
    expect(link).toHaveClass('shadow-cut')
    expect(link.querySelector('[data-slot="button-arrow"]')).not.toBeNull()
  })

  it('external swaps the arrow for the new-tab glyph and says so', () => {
    render(
      <LinkButton href="https://example.org" external withArrow>
        Accessibility basics
      </LinkButton>,
    )
    const link = screen.getByRole('link', { name: 'Accessibility basics (opens in a new tab)' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.querySelector('[data-slot="button-arrow"]')).toBeNull()
  })

  it('Space does not press it: it is a link, and only Enter follows it', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault())
    render(
      <LinkButton href="/runs" onClick={onClick}>
        Open run
      </LinkButton>,
    )
    await userEvent.keyboard('{Tab}')
    await userEvent.keyboard(' ')
    expect(onClick).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })
})
