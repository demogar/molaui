import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { StreamingText } from '../streaming-text'

import { Citation, SourceList, citationRenderer, type Source } from './sources'

const SOURCES: Source[] = [
  { id: 1, title: 'Results table', href: 'https://example.com/1', domain: 'experiments.cayuco.internal', snippet: 'Control 31.2%.' },
  {
    id: 2,
    title: 'Segment breakdown',
    href: 'https://example.com/2',
    domain: 'experiments.cayuco.internal',
    snippet: 'Beginner cohort: +4.1 pts.',
    retrievedAt: '2026-10-05T14:02:03Z',
  },
]

describe('Citation', () => {
  it('is named by the source title and links to its card', () => {
    render(<Citation n={2} title="Segment breakdown" />)
    const link = screen.getByRole('link', { name: 'Source 2: Segment breakdown' })
    expect(link).toHaveAttribute('href', '#source-2')
  })

  it('takes its name from the source when no title is given', () => {
    render(<Citation n={2} source={SOURCES[1]} />)
    expect(screen.getByRole('link', { name: 'Source 2: Segment breakdown' })).toHaveAttribute('href', '#source-2')
  })

  it('opens the preview card on keyboard focus and closes it with Escape', async () => {
    const user = userEvent.setup()
    render(<Citation n={2} source={SOURCES[1]} />)
    await user.tab()
    expect(screen.getByRole('link', { name: 'Source 2: Segment breakdown' })).toHaveFocus()
    const open = await screen.findByRole('link', { name: /Open source 2/ })
    expect(open).toHaveAttribute('href', 'https://example.com/2')
    expect(screen.getByText('“Beginner cohort: +4.1 pts.”')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: /Open source 2/ })).not.toBeInTheDocument()
  })

  it('opens on the first tap instead of navigating, and follows the link on the second', () => {
    render(<Citation n={2} source={SOURCES[1]} />)
    const marker = screen.getByRole('link', { name: 'Source 2: Segment breakdown' })

    fireEvent.pointerDown(marker, { pointerType: 'touch' })
    const first = fireEvent.click(marker)
    expect(first).toBe(false) // default prevented: the page did not jump
    expect(screen.getByRole('link', { name: /Open source 2/ })).toBeInTheDocument()

    fireEvent.pointerDown(marker, { pointerType: 'touch' })
    expect(fireEvent.click(marker)).toBe(true)
  })

  it('leaves a mouse click alone', () => {
    render(<Citation n={2} source={SOURCES[1]} />)
    const marker = screen.getByRole('link', { name: 'Source 2: Segment breakdown' })
    fireEvent.pointerDown(marker, { pointerType: 'mouse' })
    expect(fireEvent.click(marker)).toBe(true)
  })
})

describe('citationRenderer', () => {
  it('gives marker n the card for source n, matching the list', async () => {
    const user = userEvent.setup()
    const render2 = citationRenderer(SOURCES)
    render(
      <>
        <StreamingText text="Lift is in beginners [2], overall too [1]." renderCitation={render2} />
        <SourceList sources={SOURCES} />
      </>,
    )
    const marker = screen.getByRole('link', { name: 'Source 2: Segment breakdown' })
    expect(document.querySelector(marker.getAttribute('href')!)).toHaveTextContent('Segment breakdown')
    await user.hover(marker)
    expect(await screen.findByRole('link', { name: /Open source 2/ })).toHaveAttribute('href', 'https://example.com/2')
  })

  it('renders a marker with no matching source as a plain marker', () => {
    render(<>{citationRenderer(SOURCES)(9)}</>)
    expect(screen.getByRole('link', { name: 'Source 9' })).toHaveAttribute('href', '#source-9')
  })
})

describe('SourceList', () => {
  it('gives each card the id the citation points at', () => {
    const { container } = render(
      <SourceList sources={[{ id: 2, title: 'T', href: 'https://example.com', domain: 'example.com' }]} />,
    )
    expect(container.querySelector('#source-2')).toBeInTheDocument()
  })
})
