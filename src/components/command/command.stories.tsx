import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bot, FileText, FlaskConical, Moon, Play, Plus, Search, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { KbdChord } from '../typography'
import { type CommandGroup, CommandPalette, useCommandShortcut } from './command'

const groups: CommandGroup[] = [
  {
    heading: 'Actions',
    items: [
      { id: 'new-run', label: 'Start a new run', icon: <Play />, shortcut: ['⌘', 'R'], keywords: ['execute', 'invoke'], onSelect: fn() },
      { id: 'new-exp', label: 'New experiment', icon: <Plus />, shortcut: ['⌘', 'E'], onSelect: fn() },
      { id: 'theme', label: 'Toggle dark theme', icon: <Moon />, keywords: ['appearance', 'night'], onSelect: fn() },
      { id: 'purge', label: 'Purge knowledge index', icon: <Trash2 />, description: 'Owners only', disabled: true, onSelect: fn() },
    ],
  },
  {
    heading: 'Agents',
    items: [
      { id: 'a1', label: 'knowledge-agent', description: 'Answers from the help centre', icon: <Bot />, onSelect: fn() },
      { id: 'a2', label: 'game-review-agent', description: 'Annotates a finished game', icon: <Bot />, onSelect: fn() },
      { id: 'a3', label: 'moderation-triage', description: 'Sorts fair-play reports', icon: <Bot />, onSelect: fn() },
    ],
  },
  {
    heading: 'Go to',
    items: [
      { id: 'g1', label: 'Experiments', icon: <FlaskConical />, shortcut: ['G', 'E'], onSelect: fn() },
      { id: 'g2', label: 'Documents', icon: <FileText />, shortcut: ['G', 'D'], onSelect: fn() },
      { id: 'g3', label: 'Settings', icon: <Settings />, shortcut: ['G', 'S'], keywords: ['preferences'], onSelect: fn() },
    ],
  },
]

const meta = {
  title: 'Components/Overlays/Command palette',
  component: CommandPalette,
  args: { open: true, onOpenChange: fn(), groups },
  parameters: {
    // Base UI's focus trap puts aria-hidden sentinel spans (tabindex=0) beside
    // the modal and immediately redirects any focus they receive back into
    // the popup. axe sees "focusable inside aria-hidden" without seeing the
    // redirect. Verified by keyboard in the tests; disabled for that rule only.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    docs: {
      // Opens on render, so each story gets its own frame: open overlays
      // inline on the docs page would stack over the text, and a modal one
      // would lock the whole page.
      story: { inline: false, height: '520px' },
      story: { inline: false, height: '560px' },
      description: {
        component:
          'The keyboard’s front door. The input is a `combobox` that never loses focus; results are a `listbox` of `option`s in labelled `group`s; the highlight moves via `aria-activedescendant` so typing never has to re-focus. The highlight is the **ink fill**, as in Menu, and wraps at both ends. It opens in the top third so results grow downward instead of the box jumping with each keystroke. Matching is plain substring on every word — deliberately not fuzzy: a matcher that offers “Delete agent” for “dagent” is a liability.',
      },
    },
  },
} satisfies Meta<typeof CommandPalette>

export default meta
type Story = StoryObj<typeof meta>

function WithShortcut() {
  const [open, setOpen] = useState(false)
  useCommandShortcut(() => setOpen((o) => !o))
  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" icon={<Search />} onClick={() => setOpen(true)}>
        Search
      </Button>
      <span className="text-sm text-ink-muted">
        or press <KbdChord keys={['⌘', 'K']} />
      </span>
      <CommandPalette open={open} onOpenChange={setOpen} groups={groups} />
    </div>
  )
}

export const Default: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(args.open)
    return <CommandPalette {...args} open={open} onOpenChange={setOpen} />
  },
}

export const OpenWithCmdK: Story = {
  render: () => <WithShortcut />,
  parameters: {
    docs: { description: { story: '`useCommandShortcut` binds ⌘K **and** Ctrl-K — half of every internal team is not on a Mac.' } },
  },
}

export const NoMatches: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(true)
    return (
      <CommandPalette
        {...args}
        open={open}
        onOpenChange={setOpen}
        groups={[]}
        renderEmpty={() => 'No commands yet — this workspace has no agents.'}
      />
    )
  },
}
