import type { Meta, StoryObj } from '@storybook/react-vite'
import { Archive, ChevronDown, Copy, Download, GitBranch, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { fn } from 'storybook/test'

import { Button, IconButton } from '../button'
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuTrigger,
} from './menu'

const meta = {
  title: 'Components/Overlays/Menu',
  component: MenuContent,
  parameters: {
    // Base UI's focus trap puts aria-hidden sentinel spans (tabindex=0) beside
    // the modal and immediately redirects any focus they receive back into
    // the popup. axe sees "focusable inside aria-hidden" without seeing the
    // redirect. Verified by keyboard in the tests; disabled for that rule only.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    layout: 'centered',
    docs: {
      // Opens on render, so each story gets its own frame: open overlays
      // inline on the docs page would stack over the text, and a modal one
      // would lock the whole page.
      story: { inline: false, height: '640px' },
      description: {
        component:
          'Actions on a thing that do not each deserve a button. The highlighted row fills with **ink** — the top layer cut out around the one row you are on — rather than a pale tint that vanishes in sunlight. A destructive item highlights in **rojo**, so red arrives at the moment of choosing and a menu at rest does not shout. Typeahead, arrow keys, submenus and focus return come from Base UI.',
      },
    },
  },
} satisfies Meta<typeof MenuContent>

export default meta
type Story = StoryObj<typeof meta>

export const RowActions: Story = {
  render: () => (
    <Menu defaultOpen>
      <MenuTrigger
        render={
          <IconButton label="Run actions" variant="secondary" size="sm">
            <MoreHorizontal />
          </IconButton>
        }
      />
      <MenuContent align="end">
        <MenuItem icon={<Pencil />} shortcut="E" onClick={fn()}>
          Rename
        </MenuItem>
        <MenuItem icon={<Copy />} shortcut="⌘D">
          Duplicate
        </MenuItem>
        <MenuItem icon={<GitBranch />}>Fork from last step</MenuItem>
        <MenuSubmenu>
          <MenuSubmenuTrigger icon={<Share2 />}>Export</MenuSubmenuTrigger>
          <MenuContent side="inline-end" align="start" sideOffset={2} alignOffset={-6}>
            <MenuItem icon={<Download />}>Trace as JSON</MenuItem>
            <MenuItem icon={<Download />}>Transcript as Markdown</MenuItem>
            <MenuItem disabled icon={<Download />}>
              Replay bundle
            </MenuItem>
          </MenuContent>
        </MenuSubmenu>
        <MenuSeparator />
        <MenuItem icon={<Archive />}>Archive</MenuItem>
        <MenuItem icon={<Trash2 />} tone="danger" shortcut="⌫">
          Delete run
        </MenuItem>
      </MenuContent>
    </Menu>
  ),
}

function ViewOptions() {
  const [columns, setColumns] = useState({ status: true, owner: true, cost: false, latency: true })
  const [sort, setSort] = useState('updated')
  return (
    <Menu defaultOpen>
      <MenuTrigger
        render={
          <Button variant="secondary" size="sm">
            View <ChevronDown />
          </Button>
        }
      />
      <MenuContent>
        <MenuGroup>
          <MenuGroupLabel>Columns</MenuGroupLabel>
          {(Object.keys(columns) as (keyof typeof columns)[]).map((key) => (
            <MenuCheckboxItem
              key={key}
              checked={columns[key]}
              onCheckedChange={(checked) => setColumns((c) => ({ ...c, [key]: checked }))}
            >
              {key[0]!.toUpperCase() + key.slice(1)}
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Sort by</MenuGroupLabel>
          <MenuRadioGroup value={sort} onValueChange={(value) => setSort(value as string)}>
            <MenuRadioItem value="updated">Last updated</MenuRadioItem>
            <MenuRadioItem value="created">Created</MenuRadioItem>
            <MenuRadioItem value="cost">Cost</MenuRadioItem>
          </MenuRadioGroup>
        </MenuGroup>
      </MenuContent>
    </Menu>
  )
}

export const CheckboxAndRadio: Story = {
  render: () => <ViewOptions />,
  parameters: {
    docs: {
      description: {
        story:
          'Toggling does not close the menu — column toggles are chosen several at a time. The radio mark is a filled square: a dot would be the only round thing in the system.',
      },
    },
  },
}
