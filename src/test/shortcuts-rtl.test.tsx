import { render, screen, within } from '@/test/render'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CommandPalette } from '../components/command'
import { SearchInput } from '../components/field'
import { MenuShortcut } from '../components/menu'
import { HotkeysProvider, ShortcutsDialog, useHotkeys } from '../components/shortcuts'
import { Tooltip } from '../components/tooltip'
import { Kbd, KbdChord } from '../components/typography'
import { DirectionProvider } from '../lib/direction'

/**
 * Keyboard shortcuts stay left to right in a right-to-left page (#164): a
 * shortcut is typed in a fixed order, so macOS and Windows show it that way in
 * Arabic and Hebrew locales, and so does Mola. jsdom lays nothing out, so the
 * test checks the two things the browser's order comes from: the keys are in
 * typing order in the DOM, and the row holding them (and each key) resolves
 * to `dir="ltr"` rather than inheriting the page's `rtl`. Without the `dir`,
 * a flex row of keys is drawn right to left (G then E read as E then G) and a
 * neutral glyph swaps sides with a letter inside one key (⌘K read as K⌘).
 *
 * `dir="rtl"` goes on <html>, as an app sets it, because the dialog, tooltip
 * and palette portal to <body> and would escape a wrapper's direction.
 */

beforeEach(() => {
  document.documentElement.dir = 'rtl'
})
afterEach(() => {
  document.documentElement.removeAttribute('dir')
})

const rtl = (children: React.ReactNode) => <DirectionProvider direction="rtl">{children}</DirectionProvider>

/** The direction an element's text is laid out in: its own `dir` or its nearest ancestor's. */
const direction = (el: Element) => el.closest('[dir]')?.getAttribute('dir')

function commonAncestor(nodes: Element[]): Element {
  let row = nodes[0]!.parentElement!
  while (!nodes.every((n) => row.contains(n))) row = row.parentElement!
  return row
}

/** The keys are in typing order, and neither their row nor any key follows the page's right-to-left. */
function expectLeftToRight(keys: Element[], order: string[]) {
  expect(keys.map((k) => k.textContent)).toEqual(order)
  if (keys.length > 1) expect(direction(commonAncestor(keys))).toBe('ltr')
  for (const key of keys) expect(direction(key)).toBe('ltr')
}

function Bind({ keys, label }: { keys: string; label: string }) {
  useHotkeys(keys, () => {}, { label, group: 'Go to' })
  return null
}

describe('keyboard shortcuts in a right-to-left page', () => {
  it('Kbd and KbdChord: one key keeps ⌘K, a chord keeps Ctrl then K', () => {
    render(
      rtl(
        <>
          <Kbd>⌘K</Kbd>
          <KbdChord keys={['Ctrl', 'K']} />
        </>,
      ),
    )
    expectLeftToRight([screen.getByText('⌘K')], ['⌘K'])
    const chord = document.querySelector('[data-slot="kbd-chord"]')!
    expect(direction(chord)).toBe('ltr')
    expectLeftToRight([...chord.querySelectorAll('[data-slot="kbd"]')], ['Ctrl', 'K'])
  })

  it('ShortcutsDialog: a sequence reads G then E, and a chord Ctrl then K', async () => {
    render(
      rtl(
        <HotkeysProvider platform="other">
          <Bind keys="g e" label="Go to escalations" />
          <Bind keys="mod+k" label="Open the palette" />
          <ShortcutsDialog defaultOpen hotkey={false} />
        </HotkeysProvider>,
      ),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    const row = (label: string) => within(dialog).getByText(label).parentElement!
    const sequence = row('Go to escalations')
    expectLeftToRight([...sequence.querySelectorAll('[data-slot="kbd"]')], ['G', 'E'])
    // The word between the steps sits inside the left-to-right row too.
    const then = within(sequence).getByText('then')
    expect(direction(then)).toBe('ltr')
    expect(direction(commonAncestor([...sequence.querySelectorAll('[data-slot="kbd"]'), then]))).toBe('ltr')
    expectLeftToRight([...row('Open the palette').querySelectorAll('[data-slot="kbd"]')], ['Ctrl', 'K'])
  })

  it('CommandPalette: a command’s hotkey reads G then R', async () => {
    render(
      rtl(
        <HotkeysProvider platform="other">
          <CommandPalette
            open
            onOpenChange={() => {}}
            groups={[{ heading: 'Go to', items: [{ id: 'runs', label: 'Runs', hotkey: 'g r', onSelect() {} }] }]}
          />
        </HotkeysProvider>,
      ),
    )
    const option = await screen.findByRole('option', { name: /Runs/ })
    expectLeftToRight([within(option).getByText('G'), within(option).getByText('R')], ['G', 'R'])
  })

  it('Tooltip: its shortcut reads ⇧ then ⌘ then P', async () => {
    render(
      rtl(
        <Tooltip content="Open the palette" shortcut={['⇧', '⌘', 'P']} defaultOpen>
          <button type="button">Palette</button>
        </Tooltip>,
      ),
    )
    const popup = (await screen.findByText('Open the palette', { selector: 'span' })).parentElement!
    expectLeftToRight([...popup.querySelectorAll('kbd')], ['⇧', '⌘', 'P'])
  })

  it('SearchInput and MenuShortcut: a key hint keeps ⌘K', () => {
    render(
      rtl(
        <>
          <SearchInput aria-label="Search runs" shortcut="⌘K" />
          <MenuShortcut>⌘E</MenuShortcut>
        </>,
      ),
    )
    expectLeftToRight([screen.getByText('⌘K')], ['⌘K'])
    expectLeftToRight([screen.getByText('⌘E')], ['⌘E'])
  })
})
