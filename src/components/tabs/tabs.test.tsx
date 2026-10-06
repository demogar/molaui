import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Tabs, TabsList, TabsPanel, TabsTab } from './tabs'

function Example({ variant }: { variant?: 'underline' | 'panel' }) {
  return (
    <Tabs defaultValue="a" variant={variant}>
      <TabsList>
        <TabsTab value="a">Trace</TabsTab>
        <TabsTab value="b" count={3}>
          Output
        </TabsTab>
        <TabsTab value="c">Cost</TabsTab>
      </TabsList>
      <TabsPanel value="a">Panel A</TabsPanel>
      <TabsPanel value="b">Panel B</TabsPanel>
      <TabsPanel value="c">Panel C</TabsPanel>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('exposes tabs, a selected state and the linked panel', () => {
    render(<Example />)
    expect(screen.getByRole('tab', { name: 'Trace' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel A')
  })

  it('moves with the arrow keys and selects with Enter', async () => {
    render(<Example variant="panel" />)
    await userEvent.tab()
    expect(screen.getByRole('tab', { name: 'Trace' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    const output = screen.getByRole('tab', { name: /Output/ })
    expect(output).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(output).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel B')
  })

  it('includes the count in the tab', () => {
    render(<Example />)
    expect(screen.getByRole('tab', { name: /Output/ })).toHaveTextContent('3')
  })
})
