import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger, Collapsible, CollapsiblePanel, CollapsibleTrigger } from './accordion'

describe('Accordion', () => {
  it('wraps triggers in headings and toggles aria-expanded', async () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger meta="2 fields">Model</AccordionTrigger>
          <AccordionPanel>Provider and temperature</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    )
    const trigger = screen.getByRole('button', { name: /Model/ })
    expect(trigger.closest('h3')).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Provider and temperature')).toBeVisible()
  })

  it('opens from the keyboard', async () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>Limits</AccordionTrigger>
          <AccordionPanel>50 steps</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    )
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Limits' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('toggles the focused section with Space, and Tab moves to the next trigger', async () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>Limits</AccordionTrigger>
          <AccordionPanel>50 steps</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Tools</AccordionTrigger>
          <AccordionPanel>Search</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    )
    const limits = screen.getByRole('button', { name: 'Limits' })
    await userEvent.tab()
    expect(limits).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(limits).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard(' ')
    expect(limits).toHaveAttribute('aria-expanded', 'false')
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Tools' })).toHaveFocus()
  })
})

describe('Collapsible', () => {
  it('toggles its panel', async () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Raw response</CollapsibleTrigger>
        <CollapsiblePanel>payload</CollapsiblePanel>
      </Collapsible>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Raw response' }))
    expect(screen.getByRole('button', { name: 'Raw response' })).toHaveAttribute('aria-expanded', 'true')
  })
})
